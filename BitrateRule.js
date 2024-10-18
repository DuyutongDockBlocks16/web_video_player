var BitrateRule;

function BitrateRuleClass() {

    let context = this.context;
    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel')(context).getInstance();
    let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
    let StreamController = factory.getSingletonFactoryByName('StreamController');
    let instance;
    let INSUFFICIENT_BUFFER_SAFETY_FACTOR = 0.5;
    let react = 0;
    let startupDelay = 3;
    let lowBufferDelay = 3;
    let lastBufferLevel = 0;
    let bufferLevelHistory = [];

    let lastSwitchTime = 0;


    // Gets called when the rule is created
    function setup() {
        console.log('Rule Created');
    }


    // This function gets called every time a segment is downloaded. Design your bitrate algorithm around that principle.
    function getMaxIndex(rulesContext) {

        let currentTime = player.time(); // 获取当前播放时间
        if (currentTime - lastSwitchTime < 10 && lastSwitchTime !== 0) {
            console.log('Switching too frequent, skipping this time.');
            return SwitchRequest(context).create(); // 如果在8秒内已经发生切换，跳过这次
        }

        var mediaType = rulesContext.getMediaType();
        var metrics = MetricsModel.getMetricsFor(mediaType, true);
        let dashMetrics = DashMetrics(context).getInstance();

        let requests = dashMetrics.getHttpRequests(mediaType);

        let streamInfo = rulesContext.getStreamInfo();
        let isDynamic = streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic;
        let representationInfo = rulesContext.getRepresentationInfo();
        let fragmentDuration = representationInfo.fragmentDuration;

        // A smart bitrate rule could analyze playback metrics to take the
        // bitrate switching decision. Printing metrics here as a reference.
        // Go through them to see what you have available.
        // console.log(metrics);

        let bufferLevel = 0;
        if (metrics['BufferLevel'].length > 0) {
            bufferLevel = metrics['BufferLevel'][metrics['BufferLevel'].length-1]['level'];
        }
        if (lastBufferLevel === 0){
            lastBufferLevel = bufferLevel;
            bufferLevelHistory.push(bufferLevel);
            if (bufferLevelHistory.length > 5) {
                bufferLevelHistory = bufferLevelHistory.slice(bufferLevelHistory.length-5, bufferLevelHistory.length)
            }
        }

        let quality = 0;
        let switchReason = "";

        // Get current bitrate
        let streamController = StreamController(context).getInstance();
        let abrController = rulesContext.getAbrController();
        let current = abrController.getQualityFor(mediaType, streamController.getActiveStreamInfo().id);
        let throughputHistory = abrController.getThroughputHistory();
        let throughput = throughputHistory.getAverageThroughput(mediaType, isDynamic);
        let latency = throughputHistory.getAverageLatency(mediaType);
        let bitrate = throughput * (bufferLevel / fragmentDuration) * INSUFFICIENT_BUFFER_SAFETY_FACTOR;

        let lowBufferQuality = getProperQualityIndex(bitrate, rulesContext.getMediaInfo()['bitrateList'], bufferLevel);
        quality = getProperQualityIndex(throughput, rulesContext.getMediaInfo()['bitrateList'], bufferLevel);
        quality = Math.min(quality, lowBufferQuality)
        switchReason = "Proper BitRate";

        if (lastBufferLevel - bufferLevel > 600) {
            quality = 0;
            react = 2;
            switchReason = "Buffer Drop";
        }
        if (bufferLevelHistory[bufferLevelHistory.length-3] - bufferLevel > 1800) {
            quality = 0;
            react = 2;
            switchReason = "Buffer Drop";
        }

        currentRequest = requests[requests.length-1];
        if (currentRequest) {
            let totalTime = (currentRequest._tfinish.getTime() - currentRequest.trequest.getTime()) / 1000;
            let downloadTime = (currentRequest._tfinish.getTime() - currentRequest.tresponse.getTime()) / 1000;
            let totalBytesLength = getBytesLength(currentRequest);
            totalBytesLength *= 8;
            calculatedBandwidth = totalBytesLength / downloadTime;

            if ((calculatedBandwidth*1024)*0.9 < rulesContext.getMediaInfo()['bitrateList'][0].bandwidth) {
                quality = 0;
                react = 2;
            }
        }

        lastBufferLevel = bufferLevel;

        // If quality matches current bitrate, don't do anything
        if (current === quality) {
            react = 0;
            console.log('Do nothing!');
            return SwitchRequest(context).create();
        }
        else{
            if (react < 2) {
                if (current - quality < 2 || quality - current < 2) {
                    react += 2
                }
                else{
                    react += 1;
                }
                console.log('Do nothing!');
                return SwitchRequest(context).create();
            }
            else{
                // Send quality switch request
                react = 0;
                console.log("Switching quality");
                let switchRequest = SwitchRequest(context).create();
                switchRequest.quality = quality;
                switchRequest.reason = switchReason;
                switchRequest.priority = SwitchRequest.PRIORITY.STRONG;

                lastSwitchTime = currentTime;
                return switchRequest;
            }
        }

    }

    function getProperQualityIndex(currentThroughput, bitRateList, bufferLevel) {
        let index = 0;
        bitRateList.forEach((element, i) => {
            if ((currentThroughput*1024)*0.9 > element.bandwidth){
                index = i;
            }
        });

        if (index <= 2) {
            index = 0;
            return index;
        }

        if (bufferLevel >= 9000) {
            index += 1;
            react = 2;
        } else if  (bufferLevel <= 9000 && bufferLevel >= 2500) {
            index = index === 0 ? index : index - 1;
            react = 2;
        } else if (bufferLevel < 2500) {
            index = 0;
            lowBufferDelay = 3;
        }
        else{
            if (lowBufferDelay !== 0) {
                index = 0;
                lowBufferDelay = lowBufferDelay - 1
            }
        }

        if (isNaN(currentThroughput)) {
            index = 0;
            startupDelay = 5;
        }
        else{
            if (startupDelay !== 0) {
                index = 0;
                startupDelay = startupDelay - 1
            }
        }

        return index;

        // if (bufferLevel > 9250) {
        //     index += 1;
        //     react = 2;
        // }

        // if ((currentThroughput*1024) < bitRateList[0].bandwidth) {
        //     index = 0;
        //     react = 2;
        // }

        // if (bufferLevel < 9000) {
        //     index += 1;
        // }
    }

    function getBytesLength(request) {
        return request.trace.reduce(function (a, b) {
            return a + b.b[0];
        }, 0);
    }

    instance = {
        getMaxIndex: getMaxIndex
    };

    setup();

    return instance;
}

// Register the custom rule
BitrateRuleClass.__dashjs_factory_name = 'BitrateRule';
BitrateRule = dashjs.FactoryMaker.getClassFactory(BitrateRuleClass);

player.addABRCustomRule('qualitySwitchRules', 'BitrateRule', BitrateRule);