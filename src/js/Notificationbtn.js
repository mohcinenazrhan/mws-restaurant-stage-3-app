class Notificationbtn {

    constructor() {
        if (!Notificationbtn.instance) {

            this.iconState = null;
            this.notifContainer = null;
            this.notifLauncher = null;
            this.message = null;
            this.dialog = null;
            this.pulseRing = null;
            this.messageText = null;
            this.notificationCircle = null;
            this.dialogHeadTitle = null;
            this.dialogBodyText = null;
            this.toggel = false;
            this.btnClicked = false;

            Notificationbtn.instance = this;
        }

        return Notificationbtn.instance;
    }

    init(options) {
        this.options = Object.assign({}, {
                btnPosition: 'right', // left | right
                btnWidth: 'md', // sm | lg | md
                popupDialogImg: 'https://onesignal.com/bell/chrome-unblock.jpg',
                popupDialogTextAllowed: 'Follow these instructions to block notifications',
                popupDialogTextBlocked: 'Follow these instructions to allow notifications',
                popupDialogTitleAllowed: 'Block Notifications',
                popupDialogTitleBlocked: 'Unblock Notifications',
                shortMessageIfAllowed: 'You\'ve autorise notifications',
                shortMessageIfBlocked: 'You\'ve blocked notifications',
                stateColorAllowed: '#4CAF50',
                stateColorBlocked: '#e54b4d'
            },
            options
        )
    }

    checkNotifSupport() {
        if (!('Notification' in window)) {
            console.info('Your browser doesn\'t support Notification');
            return false;
        }

        return true;
    }

    /**
     * Create notification botton
     * @param {*} options 
     */
    create(options = {}) {
        // console.log(options);
        if (!this.checkNotifSupport()) return;

        this.init(options);

        this.injectHtml();
        this.setVariablesDom();
        this.setPermissionBtn();
        this.eventClickBtn();
        this.eventMouseBtn();
        this.listenToChangePermission();
    }

    setVariablesDom() {
        this.iconState = document.getElementById('notificationbtn-state');
        this.notifContainer = document.getElementById('notificationbtn-bell-container');
        this.notifLauncher = document.getElementById('notificationbtn-bell-launcher');
        this.message = document.querySelector('.notificationbtn-bell-launcher-message');
        this.dialog = document.querySelector('.notificationbtn-bell-launcher-dialog');
        this.pulseRing = this.notifLauncher.querySelector('.pulse-ring');
        this.messageText = document.querySelector('.notificationbtn-bell-launcher-message-body');
        this.notificationCircle = document.getElementById('notification-circle');
        this.dialogHeadTitle = this.dialog.querySelector('.dialoghead-title');
        this.dialogBodyText = this.dialog.querySelector('.dialogbody-text');
    }

    eventMouseBtn() {
        this.notifLauncher.addEventListener('mouseover', () => {
            this.message.classList.add('notificationbtn-bell-launcher-message-opened');
        });

        this.notifLauncher.addEventListener('mouseout', () => {
            this.message.classList.remove('notificationbtn-bell-launcher-message-opened');
        });
    }

    eventClickBtn() {
        this.notifLauncher.addEventListener('click', () => {
            this.triggerPermission()
            if (this.toggel === false)
                this.dialog.classList.add('notificationbtn-bell-launcher-dialog-opened');
            else this.dialog.classList.remove('notificationbtn-bell-launcher-dialog-opened');

            this.btnClicked = true;
            this.toggel = !this.toggel;

            this.pulseRing.classList.remove('pulse-ring-animation');
            void this.pulseRing.offsetWidth;
            this.pulseRing.classList.add('pulse-ring-animation');
        });

        window.addEventListener('click', (e) => {
            if (this.btnClicked === true) {
                this.btnClicked = false;
                return;
            }

            if (this.toggel === true) {
                this.dialog.classList.remove('notificationbtn-bell-launcher-dialog-opened');
                this.toggel = !this.toggel;
            }

            return;
        });
    }

    listenToChangePermission() {
        if ('permissions' in navigator) {
            navigator.permissions.query({
                name: 'notifications'
            }).then((notificationPerm) => {
                notificationPerm.onchange = () => {
                    if (notificationPerm.state === 'granted') this.permissionAllowedState();
                    else this.permissionBlockedState();
                };
            });
        }
    }

    permissionAllowedState() {
        this.notificationCircle.style.fill = this.options.stateColorAllowed;
        this.dialogHeadTitle.style.color = this.options.stateColorBlocked;
        this.messageText.innerHTML = this.options.shortMessageIfAllowed;
        this.dialogHeadTitle.innerHTML = this.options.popupDialogTitleAllowed;
        this.dialogBodyText.innerHTML = this.options.popupDialogTextAllowed;
        this.iconState.style.visibility = 'hidden';
    }

    permissionBlockedState() {
        this.notificationCircle.style.fill = this.options.stateColorBlocked;
        this.dialogHeadTitle.style.color = this.options.stateColorAllowed;
        this.messageText.innerHTML = this.options.shortMessageIfBlocked;
        this.dialogHeadTitle.innerHTML = this.options.popupDialogTitleBlocked;
        this.dialogBodyText.innerHTML = this.options.popupDialogTextBlocked;
        this.iconState.style.visibility = 'visible';
    }

    setPermissionBtn() {
        const Notification = window.Notification || window.mozNotification || window.webkitNotification;

        if (Notification.permission === 'granted') {
            this.permissionAllowedState();
        } else if (Notification.permission === 'denied' || Notification.permission === 'default') {
            this.permissionBlockedState();
        }
    }

    triggerPermission() {
        if (Notification.permission === 'denied' || Notification.permission === 'default')
            Notification.requestPermission()
    }

    injectHtml() {
        const html = `
            <div id="notificationbtn-bell-container" class="notificationbtn-bell-container notificationbtn-reset notificationbtn-bell-container-bottom-${this.options.btnPosition}">
                <div id="notificationbtn-bell-launcher" class="notificationbtn-bell-launcher notificationbtn-bell-launcher-${this.options.btnWidth} notificationbtn-bell-launcher-bottom-${this.options.btnPosition} notificationbtn-bell-launcher-theme-default notificationbtn-bell-launcher-active">
                    <div class="notificationbtn-bell-launcher-button">
                        <svg class="notificationbtn-bell-svg" xmlns="http://www.w3.org/2000/svg" width="99.7" height="99.7" viewBox="0 0 99.7 99.7" style="filter: drop-shadow(0 2px 4px rgba(34,36,38,0.35));; -webkit-filter: drop-shadow(0 2px 4px rgba(34,36,38,0.35));;">
                            <circle class="background" cx="49.9" cy="49.9" r="49.9" id="notification-circle"></circle>
                            <line class="stroke" id="notificationbtn-state" y2="80" x2="15" y1="15" x1="80" stroke-width="4" stroke="#fff" fill="none" />
                            <path class="foreground" d="M50.1 66.2H27.7s-2-.2-2-2.1c0-1.9 1.7-2 1.7-2s6.7-3.2 6.7-5.5S33 52.7 33 43.3s6-16.6 13.2-16.6c0 0 1-2.4 3.9-2.4 2.8 0 3.8 2.4 3.8 2.4 7.2 0 13.2 7.2 13.2 16.6s-1 11-1 13.3c0 2.3 6.7 5.5 6.7 5.5s1.7.1 1.7 2c0 1.8-2.1 2.1-2.1 2.1H50.1zm-7.2 2.3h14.5s-1 6.3-7.2 6.3-7.3-6.3-7.3-6.3z" ></path>
                            <ellipse class="stroke" cx="49.9" cy="49.9" rx="37.4" ry="36.9"></ellipse>
                        </svg>
                        <div class="pulse-ring"></div>
                    </div>
                    <div class="notificationbtn-bell-launcher-badge"></div>
                    <div class="notificationbtn-bell-launcher-message">
						<div class="notificationbtn-bell-launcher-message-body">
							${this.options.shortMessageIfBlocked}
						</div>
                    </div>
                    <div class="notificationbtn-bell-launcher-dialog">
                        <div class="notificationbtn-bell-launcher-dialog-body">
							<h1 class="dialoghead-title">
								${this.options.popupDialogTitleBlocked}
							</h1>
                            <div class="divider"></div>
                            <div class="instructions">
								<p class="dialogbody-text">
									${this.options.popupDialogTextBlocked}
								</p>
                                <a href="${this.options.popupDialogImg}" target="_blank" rel="noopener">
                                    <img src="${this.options.popupDialogImg}" alt="instructions">
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        document.body.append(doc.getElementById('notificationbtn-bell-container'));
    }
}

const instance = new Notificationbtn();

export default instance;