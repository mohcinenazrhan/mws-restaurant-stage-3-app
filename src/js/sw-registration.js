class SWRegistration {

    constructor() {
        if (!SWRegistration.instance) {
            
            // Config variables & default values
            this._refreshing = false;
            this._isOffline = false;
            this._timeoutMsg = null;
            this._msgHolder = null;

            this._config = {
                swUrl: 'sw/service-worker.js',
                msgSwInstalled: 'Service Worker installed! Pages you view are cached for offline use.',
                msgOffline: 'You\'re currently offline',
                msgOnline: 'You\'re back online <a href="javascript:location.reload()">refresh</a>',
                msgWhenUpdate: 'The contents of this page have been updated. Please <a href="javascript:location.reload()">reload</a>',
                askUserWhenSwUpdated: true,
                msgSync: 'Your submit is saved and will auto-submit when you\'re online',
                classIdBtnSwUpdate: 'btn-updatesw',
                msgWhenSwUpdated: 'New version available online. Do you want to update? <button class="classIdBtnSwUpdate" id="classIdBtnSwUpdate">Yes</button>',
                preCache: 'precacheConfig', // strategy for pre-caching assets : onReload | precacheConfig
                msgSWUnsupported: 'Your browser does not support serviceworker. the app will not be available offline.'
            }

            SWRegistration.instance = this;
        }

        return SWRegistration.instance;
    }

    /**
     * Config Script
     * @param {*} config 
     */
    initConfig(config) {
        this._config = Object.assign(this._config, config)
    }

    /**
     * Service worker registration & Update Process
     */
    serviceWorkerRegistration() {
        if (!navigator.serviceWorker) return Promise.resolve();

        // listen for the controlling service worker changing
        // and reload the page
        if (this._config.preCache === 'onReload') {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (this._refreshing) return;

                window.location.reload();
                this._refreshing = true;
            });
        }

        return navigator.serviceWorker
            .register(this._config.swUrl, {
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
                    this.showMsg(this._config.msgSwInstalled);
                    return Promise.resolve();
                };

                // if there's an updated worker already waiting, call
                // updateReady()
                if (reg.waiting) {
                    this.updateReady(reg.waiting);
                    return Promise.resolve();
                }

                // if there's an updated worker installing, track its
                // progress. If it becomes "installed", call
                // updateReady()
                if (reg.installing) {
                    this.trackingprogressInstalled(reg.installing);
                    return Promise.resolve();
                }

                // otherwise, listen for new installing workers arriving.
                // If one arrives, track its progress.
                // If it becomes "installed", call
                // updateReady()
                reg.addEventListener('updatefound', () => {
                    this.trackingprogressInstalled(reg.installing);
                });
            })
            .catch((error) => console.log('Service worker not registered: ', error));
    }

    /**
     * Update notification Service Worker
     * @param {Object} worker 
     */
    updateReady(worker) {
        if (this._config.askUserWhenSwUpdated) {
            this.showMsg(this._config.msgWhenSwUpdated.replace(/classIdBtnSwUpdate/g, this._config.classIdBtnSwUpdate), null)

            document.getElementById(this._config.classIdBtnSwUpdate)
                    .addEventListener('click', (function (_this) {
                        return function () {
                            _this.updateSW(worker);
                            // hide notification bar if the user click Yes
                            _this.hideMsg();
                            // reload page if preCache not onReload to avoid reload page two times
                            if (_this._config.preCache !== 'onReload')
                                window.location.reload();
                        }
                    })(this))
            return
        }
        // if _askUserWhenSwUpdated is false just apply to updateSW
        this.updateSW(worker)
    }

    /**
     * update SW by send message to sw for skip waiting
     */
    updateSW(worker) {
        worker.postMessage({
            action: 'skipWaiting'
        });
    }

    /**
     * Update notification & Traking Service Worker
     * @param {Object} worker 
     */
    trackingprogressInstalled(worker) {
        worker.addEventListener('statechange', () => {
            if (worker.state == 'installed') {
                this.updateReady(worker);
            }
        });
    }

    /**
     * set contianer html to show sw message for user
     */
    setSwMsgContianer() {
		const container = document.createElement('div');
		container.className = 'snackbar';

		const parag = document.createElement('p');
		parag.id = 'msgOffline';
		container.appendChild(parag);

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'snackbar-close';
		button.setAttribute('aria-label', 'snackbar-close');
		button.addEventListener('click', this.hideMsg.bind(this));
		button.innerHTML = '&times;';

		container.appendChild(button);

		document.body.appendChild(container);

        window.addEventListener('online', this.updateNetworkState.bind(this));
        window.addEventListener('offline', this.updateNetworkState.bind(this));

        container.addEventListener('mouseover', () => {
            if (this._timeoutMsg !== null) 
                clearTimeout(this._timeoutMsg);
        });
        container.addEventListener('mouseout', () => {
            if (this._timeoutMsg !== null) 
                this._timeoutMsg = setTimeout(this.hideMsg.bind(this), 2000);
        });
    }

    /**
     * update Network State : onLine | OffLine
     */
    updateNetworkState() {
        if (navigator.onLine) {
            if (this._isOffline === true)  {
                this.showMsg(this._config.msgOnline);
                this.bgSyncPolyfill();
            }
            this._isOffline = false;
        } else {
            this.showMsg(this._config.msgOffline);
            this._isOffline = true;
        }
    }

    /**
     * Handler for messages coming from the service worker
     */
    listenToMessages() {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data === 'reloadThePageForMAJ') this.showMsg(this._config.msgWhenUpdate);
            if (event.data === 'NotifyUserReqSaved') this.showMsg(this._config.msgSync);
            if (event.data === 'isVisible') event.ports[0].postMessage(this.getVisibilityState());
        });
    }

    /**
     * Send message to sw
     * @param {*} msg 
     */
    send_message_to_sw(msg) {
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
	 * Show the given message in the snackbar
	 * @param {String} msg 
	 * @param {Number} timeToHide // in milliseconds
	 * @param {Boolean} priority
	 * @param {Function} callback
	 */
	showMsg(msg = '', timeToHide = 4500, priority = true, callback = null) {		
		if (msg === '') return

		if (priority === false && document.body.classList.contains('snackbar--show')) {
			this._msgHolder = { msg, timeToHide, priority, callback };
			return;
		}

		document.getElementById('msgOffline').innerHTML = msg;
		document.body.classList.add('snackbar--show');

		if (callback !== null) callback();

		if (this._timeoutMsg !== null) clearTimeout(this._timeoutMsg);
		if (timeToHide !== null) this._timeoutMsg = setTimeout(this.hideMsg.bind(this), timeToHide);
		else this._timeoutMsg = null
	}

	/**
	 * Hide snackbar
	 */
	hideMsg() {
		document.body.classList.remove('snackbar--show');

		if (this._msgHolder !== null) {
			const { msg, timeToHide, priority, callback } = this._msgHolder;
			this.showMsg(msg, timeToHide, priority, callback);
			this._msgHolder = null;
		}
	}

    /**
     * Get visibility state
     */
    getVisibilityState() {
        if (document.hidden) return false;
        else return true;
    }

    /**
     * Send message to sw to execute bg sync process 
     *  if current browser doesn't support BG Sync
     * To resubmite reqs saved when offline
     * Work as bg sync polyfill when back online
     */
    bgSyncPolyfill() {
        if (('SyncManager' in self) === false) {
            if (navigator.serviceWorker.controller) 
                this.send_message_to_sw({
                    action: 'bgSyncPolyfill'
                });
        }
    }

    /**
     * Call functions when DOMContentLoaded
     */
    callFuncsWhenDOMContentLoaded() {        
        document.addEventListener('DOMContentLoaded', () => {
            this.bgSyncPolyfill();
        });
    }

    /**
     * fire sw
     * @param {*} config 
     */
    async fire(config) {
        this.initConfig(config);
        this.setSwMsgContianer();
        if (!('serviceWorker' in navigator)) {
            this.showMsg(this._config.msgSWUnsupported);
            return Promise.reject(this._config.msgSWUnsupported);
        }

        try {
                  this.callFuncsWhenDOMContentLoaded();
            await this.serviceWorkerRegistration();
                  this.listenToMessages();
                  this.updateNetworkState();
            return Promise.resolve();
        } catch (error) {
            console.log(error);
        }
    }
}

const instance = new SWRegistration();

export default instance;