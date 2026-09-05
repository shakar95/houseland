(function(globalObj) {
  // 1. Safely polyfill DOMException
  if (typeof globalObj.DOMException === 'undefined') {
    var CustomDOMException = function(message, name) {
      this.message = message || '';
      this.name = name || 'DOMException';
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, CustomDOMException);
      }
    };
    CustomDOMException.prototype = Object.create(Error.prototype);
    CustomDOMException.prototype.constructor = CustomDOMException;
    CustomDOMException.INDEX_SIZE_ERR = 1;
    CustomDOMException.DOMSTRING_SIZE_ERR = 2;
    CustomDOMException.HIERARCHY_REQUEST_ERR = 3;

    globalObj.DOMException = CustomDOMException;
  }

  // 2. Proactively stub Performance APIs to prevent subsequent React Native 0.76+ networking crashes
  var performanceAPIs = [
    'PerformanceEntry', 
    'PerformanceMark', 
    'PerformanceMeasure', 
    'PerformanceObserver', 
    'PerformanceObserverEntryList', 
    'PerformanceEventTiming'
  ];
  
  for (var i = 0; i < performanceAPIs.length; i++) {
    var apiName = performanceAPIs[i];
    if (typeof globalObj[apiName] === 'undefined') {
      globalObj[apiName] = function() {};
    }
  }

  // 3. Ensure window mirror exists for web-focused libraries (like whatwg-fetch)
  if (typeof window !== 'undefined' && typeof window.DOMException === 'undefined') {
    window.DOMException = globalObj.DOMException;
  }

})(typeof global !== 'undefined' ? global : this);
