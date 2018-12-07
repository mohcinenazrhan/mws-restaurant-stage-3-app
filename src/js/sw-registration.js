/* eslint-env worker, serviceworker */
/* eslint-disable indent, no-unused-vars, no-multiple-empty-lines, max-nested-callbacks, space-before-function-paren, quotes, comma-spacing */

// Config variables & default values
let _refreshing = false,
    _isVisible = true,
    _askUserWhenSwUpdated = true,
    _isOffline = false,
    _swUrl = '',
    _msgOffline = '',
    _msgWhenUpdate = '',
    _msgWhenSwUpdated = '',
    _msgSync = '',
    _preCache = '';

/**
 * Config Script
 * @param {*} config 
 */
function initConfig(config) {
    _swUrl = config.swUrl;
    _msgOffline = config.msgOffline;
    _msgWhenUpdate = config.msgWhenUpdate;
    _msgWhenSwUpdated = config.msgWhenSwUpdated;
    _preCache = config.preCache;
    _askUserWhenSwUpdated = config.askUserWhenSwUpdated;
    _msgSync = config.msgSync;
}

/**
 * Service worker registration & Update Process
 */
function serviceWorkerRegistration() {
    if (!navigator.serviceWorker) return;

    // listen for the controlling service worker changing
    // and reload the page
    if (_preCache === 'onReload') {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (_refreshing) return;

            window.location.reload();
            _refreshing = true;
        });
    }

    return navigator.serviceWorker
        .register(_swUrl, {
            scope: '/'
        })
        .then((reg) => {
            console.log('Service Worker Registered');
            console.log('MNPWA service worker ready');

            // Send the urls array to the service worker
            if (_preCache === 'onAnalyzePage') {
                if (reg.installing) {
                    // console.log('preCache: onAnalyzePage');
                    reg.installing.postMessage({
                        action: 'set-preCache',
                        urls: getAllCssJsImgFromPage()
                    });
                }
            }

            // if there's no controller, this page wasn't loaded
            // via a service worker, so they're looking at the latest version.
            // In that case, exit early
            if (!navigator.serviceWorker.controller) return;

            // if there's an updated worker already waiting, call
            // _updateReady()
            if (reg.waiting) {
                updateReady(reg);
                return;
            }

            // if there's an updated worker installing, track its
            // progress. If it becomes "installed", call
            // _updateReady()
            if (reg.installing) {
                trackingprogressInstalled(reg.installing);
                return;
            }

            // otherwise, listen for new installing workers arriving.
            // If one arrives, track its progress.
            // If it becomes "installed", call
            // _updateReady()
            reg.addEventListener('updatefound', () => {
                trackingprogressInstalled(reg.installing);
            });
        })
        .catch((error) => console.log('Service worker not registered: ', error));
}

/**
 * Update notification Service Worker
 * @param {Object} worker 
 */
function updateReady(worker) {
    let ok = true; // default value
    if (_askUserWhenSwUpdated) ok = confirm(_msgWhenSwUpdated);

    if (ok) {
        worker.postMessage({
            action: 'skipWaiting'
        });
    }
}

/**
 * Update notification & Traking Service Worker
 * @param {Object} worker 
 */
function trackingprogressInstalled(worker) {
    worker.addEventListener('statechange', () => {
        if (worker.state == 'installed') {
            updateReady(worker);
        }
    });
}

/**
 * set style css for SW messaage
 */
function setStyleSw() {
    const css = `body.state-offline .offline-indicator, body.state-offline .offline-indicator--top {
        -webkit-transform: translateY(0);
        -moz-transform: translateY(0);
        -ms-transform: translateY(0);
        -o-transform: translateY(0);
        transform: translateY(0);
    }
    .offline-indicator {
        background-color: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: .9rem;
        position: fixed;
        z-index: 9999999999999999;
        left: 0;
        bottom: 0;
        width: 100%;
        -webkit-transform: translateY(100%);
        -moz-transform: translateY(100%);
        -ms-transform: translateY(100%);
        -o-transform: translateY(100%);
        transform: translateY(100%);
        will-change: transform;
        -webkit-transition: -webkit-transform 200ms ease-in-out;
        -webkit-transition-delay: 0s;
        -moz-transition: -moz-transform 200ms ease-in-out;
        -o-transition: -o-transform 200ms ease-in-out;
        transition: transform 200ms ease-in-out false;
    }
    .offline-indicator p {
        margin: 0 40px 0 0;
        color: #fff;
        text-align: center;
    }
    .offline-indicator .close-indicator {
        position: absolute;
        top: 0;
        right: 0;
        width: 45px;
        height: 100%;
        padding: 0;
        background: #000;
        border: none;
        font-size: 27px;
        font-weight: normal;
        border-radius: 0;
        color: #FFF;
    }
    .offline-indicator .close-indicator:hover,
    .offline-indicator .close-indicator:focus {
        background: #575757;
    }
    .offline-indicator a {
        color: #FFF;
        font-weight: bold;
        text-decoration: underline;
    }`,
        head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');

    style.type = 'text/css';
    if (style.styleSheet) {
        // This is required for IE8 and below.
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);
}

/**
 * set contianer html to show sw message for user
 */
function setSwMsgContianer() {
    const container = document.createElement('div');
    container.className = 'offline-indicator offline-indicator--bottom';

    const parag = document.createElement('p');
    parag.id = 'msgOffline';
    container.appendChild(parag);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'close-indicator';
    button.setAttribute('aria-label', 'close-indicator');
    button.addEventListener('click', hideMsg);

    const span = document.createElement('span');
    span.innerHTML = '&times;';

    button.appendChild(span);
    container.appendChild(button);

    // <button type="button" "class"="close" aria-label="Close">
    // 	<span>&times;</span>
    // </button>

    document.body.appendChild(container);

    window.addEventListener('online', updateNetworkState);
    window.addEventListener('offline', updateNetworkState);
}

/**
 * update Network State : onLine | OffLine
 */
function updateNetworkState() {
    if (navigator.onLine) {
        _isOffline = false;
        hideMsg();
    } else {
        _isOffline = true;
        showMsg();
    }
    
    send_message_to_sw({
        action: 'updateNetworkState',
        value: _isOffline
    })
}

/**
 * get All Css Js Img From Page for precache assets
 */
function getAllCssJsImgFromPage() {
    let arr = [];

    // Get all CSSStyleSheet
    for (CSSStyleSheet of document.styleSheets) {
        if (CSSStyleSheet.href !== null && CSSStyleSheet.href.match(/^(http|https):\/\//i))
            arr.push(CSSStyleSheet.href);
    }

    // Get all Images
    for (image of document.images) {
        if (image.src !== null && image.src.match(/^(http|https):\/\//i)) arr.push(image.src);
    }

    // Get all scripts
    for (script of document.scripts) {
        if (
            script.src !== null &&
            script.tagName === 'SCRIPT' &&
            script.src !== '' &&
            script.src.match(/^(http|https):\/\//i)
        )
            arr.push(script.src);
    }

    return arr;
}

/**
 * handle Visibility Change for the page
 */
function handleVisibilityChange() {
    if (document.hidden) {
        // console.log('hidden');
        _isVisible = false;
    } else {
        // console.log('visible');
        _isVisible = true;
    }
}
document.addEventListener('visibilitychange', handleVisibilityChange, false);

/**
 * send message to sw
 * @param {*} msg 
 */
function send_message_to_sw(msg) {
    if (!navigator.serviceWorker.controller) return
    return new Promise(function (resolve, reject) {
        // Create a Message Channel
        var msg_chan = new MessageChannel();

        // Handler for recieving message reply from service worker
        msg_chan.port1.onmessage = function (event) {
            if (event.data.error) {
                reject(event.data.error);
            } else {
                resolve(event.data);
            }
        };

        // Send message to service worker along with port for reply
        navigator.serviceWorker.controller.postMessage(msg, [msg_chan.port2]);
    });
}

function sendMsgChecksToSw() {
    window.addEventListener('load', function () {
        updateNetworkState()
    });
}

/**
 * Handler for messages coming from the service worker
 */
navigator.serviceWorker.addEventListener('message', function (event) {
    if (event.data === 'reloadThePageForMAJ') showMsg(_msgWhenUpdate);
    if (event.data === 'isVisible') event.ports[0].postMessage(_isVisible);
    if (event.data === 'isOffline') event.ports[0].postMessage(_isOffline);
    if (event.data === 'NotifyUserReqSaved') showMsg(` - ${_msgSync}`);

    // console.log('Client 1 Received Message: ' + event.data);
    // event.ports[0].postMessage("Client 1 Says 'Hello back!'");
});

// Helpers
function showMsg(msg = '') {
    let fullMsg = ''
    if (_isOffline) fullMsg += _msgOffline
    if (msg !== '') fullMsg += msg
    
    document.getElementById('msgOffline').innerHTML = fullMsg;
    document.body.classList.add('state-offline');
}

function hideMsg() {
    document.body.classList.remove('state-offline');
}

/****************** Fire Service Worker script ******************/
(function () {
    'use strict';

    if (!('serviceWorker' in navigator)) return;

    const config = {
        swUrl: 'sw/service-worker.js',
        msgOffline: "You're currently offline",
        msgWhenUpdate: `The contents of this page have been updated. Please <a href="javascript:location.reload()">reload</a>`,
        askUserWhenSwUpdated: false,
        msgSync: "Your submit is saved and will auto-submit when you're online",
        msgWhenSwUpdated: 'New version available online. Do you want to update? ',
        preCache: 'onReload' // strategy for pre-caching assets : onReload | onAnalyzePage | precacheConfig
    };
    initConfig(config);
    serviceWorkerRegistration().then(() => {
        setStyleSw();
        setSwMsgContianer();
        sendMsgChecksToSw();
    })

})();