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

/**
 * Handler for messages coming from the service worker
 */
function listenToMessages() {
    navigator.serviceWorker.addEventListener('message', function (event) {
        if (event.data === 'reloadThePageForMAJ') showMsg(_msgWhenUpdate);
        if (event.data === 'isVisible') event.ports[0].postMessage(_isVisible);
        if (event.data === 'NotifyUserReqSaved') showMsg(` - ${_msgSync}`);
    });
}

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
        preCache: 'precacheConfig' // strategy for pre-caching assets : onReload | precacheConfig
    };
    initConfig(config);
    serviceWorkerRegistration().then(() => {
        listenToMessages();
        setSwMsgContianer();
        updateNetworkState();
    })

})();