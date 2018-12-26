/* eslint-env worker, serviceworker */
/* eslint-disable indent, no-unused-vars, no-multiple-empty-lines, max-nested-callbacks, space-before-function-paren, quotes, comma-spacing */

    // Config variables & default values
    let _refreshing = false,
        _isVisible = true,
        _askUserWhenSwUpdated = true,
        _isOffline = false,
        _swUrl = '',
        _msgOffline = '',
        _msgOnline = '',
        _msgWhenUpdate = '',
        _msgWhenSwUpdated = '',
        _msgSync = '',
        _worker = null,
        _preCache = '',
        _timeoutMsg = null;

    /**
     * Config Script
     * @param {*} config 
     */
    function initConfig(config) {
        _swUrl = config.swUrl;
        _msgOffline = config.msgOffline;
        _msgOnline = config.msgOnline;
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
                if (!navigator.serviceWorker.controller) {
                    console.log('Service Worker installed');
                    showMsg('Service Worker installed! Pages you view are cached for offline use.');
                    return
                };

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
        _worker = worker
        if (_askUserWhenSwUpdated) {
            showMsg(`${_msgWhenSwUpdated} <button class="btn-updatesw" onclick="updateSW()">Yes</button>`, null)
            return
        }
        // if _askUserWhenSwUpdated is false just apply to updateSW
        updateSW()
    }

    /**
     * update SW by send message to sw for skip waiting
     */
    function updateSW() {
        _worker.postMessage({
            action: 'skipWaiting'
        });
        // hide notification bar if the user click Yes
        hideMsg();
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
            if (_isOffline === true) showMsg(_msgOnline);
            _isOffline = false;
        } else {
            showMsg(_msgOffline);
            _isOffline = true;
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
     * Handler for messages coming from the service worker
     */
    function listenToMessages() {
        navigator.serviceWorker.addEventListener('message', function (event) {
            if (event.data === 'reloadThePageForMAJ') showMsg(_msgWhenUpdate);
            if (event.data === 'isVisible') event.ports[0].postMessage(_isVisible);
            if (event.data === 'NotifyUserReqSaved') showMsg(_msgSync);
        });
    }

    /**
     * show the given message
     * @param {*} msg 
     * @param {*} timeToHide // in milliseconds
     */
    function showMsg(msg = '', timeToHide = 4500) {
        if (msg === '') return

        document.getElementById('msgOffline').innerHTML = msg;
        document.body.classList.add('state-offline');
        
        if (_timeoutMsg !== null) clearTimeout(_timeoutMsg);
        if (timeToHide !== null) _timeoutMsg = setTimeout(hideMsg, timeToHide);
    }

    /**
     * hide Msg bar
     */
    function hideMsg() {
        document.body.classList.remove('state-offline');
    }

(function () {

    'use strict';
    /****************** Fire Service Worker script ******************/

    if (!('serviceWorker' in navigator)) return;

    const config = {
        swUrl: 'sw/service-worker.js',
        msgOffline: "You're currently offline",
        msgOnline: "You're back online",
        msgWhenUpdate: `The contents of this page have been updated. Please <a href="javascript:location.reload()">reload</a>`,
        askUserWhenSwUpdated: true,
        msgSync: "Your submit is saved and will auto-submit when you're online",
        msgWhenSwUpdated: 'New version available online. Do you want to update? ',
        preCache: 'precacheConfig' // strategy for pre-caching assets : onReload | precacheConfig
    };
    
    initConfig(config);
    setSwMsgContianer();
    serviceWorkerRegistration().then(() => {
        listenToMessages();
        updateNetworkState();
    })

})();