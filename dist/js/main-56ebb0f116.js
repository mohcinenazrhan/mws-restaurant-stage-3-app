"use strict";var _createClass=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}();function _classCallCheck(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}var fetchRestaurantsData=null,DBHelper=function(){function e(){_classCallCheck(this,e)}return _createClass(e,null,[{key:"getDbUrl",value:function(){return"https://mnaz-restaurant-reviews-api.herokuapp.com/"+(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"")}},{key:"fetchRestaurants",value:function(){return fetchRestaurantsData||fetch(e.getDbUrl("restaurants")).then(function(e){return e.json()}).then(function(e){return fetchRestaurantsData=Promise.resolve(e),e}).catch(function(e){console.log(e)})}},{key:"fetchRestaurantById",value:function(t){return e.fetchRestaurants().then(function(e){return e.find(function(e){return e.id==t})})}},{key:"fetchRestaurantByCuisine",value:function(t){return e.fetchRestaurants().then(function(e){return e.filter(function(e){return e.cuisine_type==t})})}},{key:"fetchRestaurantByNeighborhood",value:function(t){return e.fetchRestaurants().then(function(e){return e.filter(function(e){return e.neighborhood==t})})}},{key:"fetchRestaurantByCuisineAndNeighborhood",value:function(t,n){return e.fetchRestaurants().then(function(e){var r=e;return"all"!=t&&(r=r.filter(function(e){return e.cuisine_type==t})),"all"!=n&&(r=r.filter(function(e){return e.neighborhood==n})),r})}},{key:"fetchNeighborhoods",value:function(){return e.fetchRestaurants().then(function(e){var t=e.map(function(t,n){return e[n].neighborhood});return t.filter(function(e,n){return t.indexOf(e)==n})})}},{key:"fetchCuisines",value:function(){return e.fetchRestaurants().then(function(e){var t=e.map(function(t,n){return e[n].cuisine_type});return t.filter(function(e,n){return t.indexOf(e)==n})})}},{key:"urlForRestaurant",value:function(e){return"./restaurant.html?id="+e.id}},{key:"imageUrlForRestaurant",value:function(e){return"/img/"+e.photograph}},{key:"srcsetImageUrlForRestaurant",value:function(e){return e.srcset_restaurant}},{key:"srcsetImageUrlForIndex",value:function(e){return e.srcset_index}},{key:"mapMarkerForRestaurant",value:function(t,n){var r=new L.marker([t.latlng.lat,t.latlng.lng],{title:t.name,alt:"Localisation of "+t.name+" restaurant",url:e.urlForRestaurant(t)});return r.addTo(newMap),r}},{key:"fetchReviewsByRestaurantId",value:function(t){return fetch(e.getDbUrl("reviews/?restaurant_id="+t)).then(function(e){return e.json()}).then(function(e){return e.filter(function(e){return e.restaurant_id==t})}).catch(function(e){console.log(e)})}},{key:"updateLocalRestaurantData",value:function(e,t){return fetchRestaurantsData.then(function(n){return n.map(function(n){return n.id===e?Object.assign(n,t):n})}).then(function(e){fetchRestaurantsData=Promise.resolve(e)})}},{key:"toggleFavoriteRestaurant",value:function(t,n){return e.updateLocalRestaurantData(t,{is_favorite:n}),fetch(e.getDbUrl("restaurants/"+t+"/"),{method:"PUT",body:JSON.stringify({is_favorite:n}),headers:{"Content-Type":"application/json"}}).then(function(e){if(302===e.status)throw"fallback";if(200===e.status||304===e.status)return e.json()}).catch(function(e){return console.log("Request failed",e),Promise.reject(e)})}}]),e}(),favoriteOnClick=function(){var e=this;this.disabled=!0;var t=parseInt(this.id.replace("fav-","")),n=!!this.classList.contains("favorite-icon--on"),r=this.classList.contains("favorite-icon--on")?"on":"off";this.classList.remove("favorite-icon--"+r),this.classList.add("favorite-icon--"+(!0==!n?"on":"off")),DBHelper.toggleFavoriteRestaurant(t,!n).then(function(t){e.classList.remove("favorite-icon--"+r),e.classList.add("favorite-icon--"+("true"===t.is_favorite.toString()?"on":"off")),e.disabled=!1}).catch(function(t){console.log(t),"fallback"===t&&(e.disabled=!1)})},favoriteClickListener=function(){var e=document.getElementsByClassName("favorite-icon");Array.from(e).forEach(function(e){e.addEventListener("click",favoriteOnClick)})},checkedRatingListener=function(){var e=document.querySelectorAll('#frating input[name="rating"]');0!==e.length&&Array.from(e).forEach(function(e){e.addEventListener("click",function(){this.checked=!0})})};function showMainContent(){document.getElementById("maincontent").classList.remove("visibility-hidden"),document.getElementById("maincontent").classList.add("fadein"),document.getElementById("footer").classList.remove("fixed-bottom"),document.querySelector(".loader").setAttribute("hidden",!0)}var restaurants=void 0,neighborhoods=void 0,cuisines=void 0,newMap=void 0,markers=[],fetchNeighborhoods=function(){DBHelper.fetchNeighborhoods().then(function(e){self.neighborhoods=e,fillNeighborhoodsHTML()}).catch(function(e){console.error(e)})},fillNeighborhoodsHTML=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.neighborhoods,t=document.getElementById("neighborhoods-select");e.forEach(function(e){var n=document.createElement("option");n.innerHTML=e,n.value=e,t.append(n)})},fetchCuisines=function(){DBHelper.fetchCuisines().then(function(e){self.cuisines=e,fillCuisinesHTML()}).catch(function(e){console.error(e)})},fillCuisinesHTML=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.cuisines,t=document.getElementById("cuisines-select");e.forEach(function(e){var n=document.createElement("option");n.innerHTML=e,n.value=e,t.append(n)})},initMap=function(){return newMap=L.map("map",{center:[40.722216,-73.987501],zoom:12,scrollWheelZoom:!1}),L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}",{mapboxToken:"pk.eyJ1IjoibW9oY2luZTkyIiwiYSI6ImNqa21lY3JoZjF1cGozcXBrOGI5cnRlNGkifQ.VcGgA3YMmeEWpARnDTyxDQ",maxZoom:18,attribution:'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',id:"mapbox.streets"}).addTo(newMap),updateRestaurants()},updateRestaurants=function(){var e=document.getElementById("cuisines-select"),t=document.getElementById("neighborhoods-select"),n=e.selectedIndex,r=t.selectedIndex,a=e[n].value,o=t[r].value;return DBHelper.fetchRestaurantByCuisineAndNeighborhood(a,o).then(function(e){resetRestaurants(e),fillRestaurantsHTML()}).catch(function(e){console.log(e)})},resetRestaurants=function(e){self.restaurants=[],document.getElementById("restaurants-list").innerHTML="",self.markers&&self.markers.forEach(function(e){return e.remove()}),self.markers=[],self.restaurants=e},fillRestaurantsHTML=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.restaurants,t=document.getElementById("restaurants-list");e.forEach(function(e){t.append(createRestaurantHTML(e))}),favoriteClickListener(),addMarkersToMap()},createRestaurantHTML=function(e){var t=document.createElement("li"),n=document.createElement("div");n.className="listitem";var r=document.createElement("img");r.setAttribute("alt",e.name),r.className="restaurant-img",r.src=DBHelper.imageUrlForRestaurant(e),r.srcset=DBHelper.srcsetImageUrlForIndex(e),n.append(r);var a=document.createElement("button");a.title="Favorite",a.setAttribute("id","fav-"+e.id),a.classList.add("favorite-icon"),a.classList.add("favorite-icon--"+("true"===e.is_favorite.toString()?"on":"off")),n.append(a);var o=document.createElement("div");o.className="content-wrapper";var i=document.createElement("h3");i.setAttribute("id","res-"+e.id),i.innerHTML=e.name,o.append(i);var s=document.createElement("p");s.innerHTML=e.neighborhood,o.append(s);var c=document.createElement("p");c.innerHTML=e.address,o.append(c);var l=document.createElement("a");return l.innerHTML="View Details",l.setAttribute("aria-labelledby","res-"+e.id),l.href=DBHelper.urlForRestaurant(e),o.append(l),n.append(o),t.append(n),t},addMarkersToMap=function(){(arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.restaurants).forEach(function(e){var t=DBHelper.mapMarkerForRestaurant(e,self.newMap);t.on("click",function(){window.location.href=t.options.url}),self.markers.push(t)})};document.addEventListener("DOMContentLoaded",function(){initMap().then(function(){return fetchNeighborhoods()}).then(function(){return fetchCuisines()}).then(function(){return showMainContent()})});var _refreshing=!1,_isVisible=!0,_askUserWhenSwUpdated=!0,_isOffline=!1,_swUrl="",_msgOffline="",_msgWhenUpdate="",_msgWhenSwUpdated="",_msgSync="",_preCache="";function initConfig(e){_swUrl=e.swUrl,_msgOffline=e.msgOffline,_msgWhenUpdate=e.msgWhenUpdate,_msgWhenSwUpdated=e.msgWhenSwUpdated,_preCache=e.preCache,_askUserWhenSwUpdated=e.askUserWhenSwUpdated,_msgSync=e.msgSync}function serviceWorkerRegistration(){if(navigator.serviceWorker)return"onReload"===_preCache&&navigator.serviceWorker.addEventListener("controllerchange",function(){_refreshing||(window.location.reload(),_refreshing=!0)}),navigator.serviceWorker.register(_swUrl,{scope:"/"}).then(function(e){console.log("Service Worker Registered"),console.log("MNPWA service worker ready"),"onAnalyzePage"===_preCache&&e.installing&&e.installing.postMessage({action:"set-preCache",urls:getAllCssJsImgFromPage()}),navigator.serviceWorker.controller&&(e.waiting?updateReady(e):e.installing?trackingprogressInstalled(e.installing):e.addEventListener("updatefound",function(){trackingprogressInstalled(e.installing)}))}).catch(function(e){return console.log("Service worker not registered: ",e)})}function updateReady(e){var t=!0;_askUserWhenSwUpdated&&(t=confirm(_msgWhenSwUpdated)),t&&e.postMessage({action:"skipWaiting"})}function trackingprogressInstalled(e){e.addEventListener("statechange",function(){"installed"==e.state&&updateReady(e)})}function setStyleSw(){var e="body.state-offline .offline-indicator, body.state-offline .offline-indicator--top {\n        -webkit-transform: translateY(0);\n        -moz-transform: translateY(0);\n        -ms-transform: translateY(0);\n        -o-transform: translateY(0);\n        transform: translateY(0);\n    }\n    .offline-indicator {\n        background-color: rgba(0, 0, 0, 0.8);\n        color: #fff;\n        padding: .9rem;\n        position: fixed;\n        z-index: 9999999999999999;\n        left: 0;\n        bottom: 0;\n        width: 100%;\n        -webkit-transform: translateY(100%);\n        -moz-transform: translateY(100%);\n        -ms-transform: translateY(100%);\n        -o-transform: translateY(100%);\n        transform: translateY(100%);\n        will-change: transform;\n        -webkit-transition: -webkit-transform 200ms ease-in-out;\n        -webkit-transition-delay: 0s;\n        -moz-transition: -moz-transform 200ms ease-in-out;\n        -o-transition: -o-transform 200ms ease-in-out;\n        transition: transform 200ms ease-in-out false;\n    }\n    .offline-indicator p {\n        margin: 0 40px 0 0;\n        color: #fff;\n        text-align: center;\n    }\n    .offline-indicator .close-indicator {\n        position: absolute;\n        top: 0;\n        right: 0;\n        width: 45px;\n        height: 100%;\n        padding: 0;\n        background: #000;\n        border: none;\n        font-size: 27px;\n        font-weight: normal;\n        border-radius: 0;\n        color: #FFF;\n    }\n    .offline-indicator .close-indicator:hover,\n    .offline-indicator .close-indicator:focus {\n        background: #575757;\n    }\n    .offline-indicator a {\n        color: #FFF;\n        font-weight: bold;\n        text-decoration: underline;\n    }",t=document.head||document.getElementsByTagName("head")[0],n=document.createElement("style");n.type="text/css",n.styleSheet?n.styleSheet.cssText=e:n.appendChild(document.createTextNode(e)),t.appendChild(n)}function setSwMsgContianer(){var e=document.createElement("div");e.className="offline-indicator offline-indicator--bottom";var t=document.createElement("p");t.id="msgOffline",e.appendChild(t);var n=document.createElement("button");n.type="button",n.className="close-indicator",n.setAttribute("aria-label","close-indicator"),n.addEventListener("click",hideMsg);var r=document.createElement("span");r.innerHTML="&times;",n.appendChild(r),e.appendChild(n),document.body.appendChild(e),window.addEventListener("online",updateNetworkState),window.addEventListener("offline",updateNetworkState)}function updateNetworkState(){navigator.onLine?(_isOffline=!1,hideMsg()):(_isOffline=!0,showMsg()),send_message_to_sw({action:"updateNetworkState",value:_isOffline})}function getAllCssJsImgFromPage(){var e=[],t=!0,n=!1,r=void 0;try{for(var a,o=document.styleSheets[Symbol.iterator]();!(t=(a=o.next()).done);t=!0)CSSStyleSheet=a.value,null!==CSSStyleSheet.href&&CSSStyleSheet.href.match(/^(http|https):\/\//i)&&e.push(CSSStyleSheet.href)}catch(e){n=!0,r=e}finally{try{!t&&o.return&&o.return()}finally{if(n)throw r}}var i=!0,s=!1,c=void 0;try{for(var l,u=document.images[Symbol.iterator]();!(i=(l=u.next()).done);i=!0)image=l.value,null!==image.src&&image.src.match(/^(http|https):\/\//i)&&e.push(image.src)}catch(e){s=!0,c=e}finally{try{!i&&u.return&&u.return()}finally{if(s)throw c}}var f=!0,d=!1,h=void 0;try{for(var m,g=document.scripts[Symbol.iterator]();!(f=(m=g.next()).done);f=!0)script=m.value,null!==script.src&&"SCRIPT"===script.tagName&&""!==script.src&&script.src.match(/^(http|https):\/\//i)&&e.push(script.src)}catch(e){d=!0,h=e}finally{try{!f&&g.return&&g.return()}finally{if(d)throw h}}return e}function handleVisibilityChange(){_isVisible=!document.hidden}function send_message_to_sw(e){if(navigator.serviceWorker.controller)return new Promise(function(t,n){var r=new MessageChannel;r.port1.onmessage=function(e){e.data.error?n(e.data.error):t(e.data)},navigator.serviceWorker.controller.postMessage(e,[r.port2])})}function sendMsgChecksToSw(){window.addEventListener("load",function(){updateNetworkState()})}function listenToMessages(){navigator.serviceWorker.addEventListener("message",function(e){"reloadThePageForMAJ"===e.data&&showMsg(_msgWhenUpdate),"isVisible"===e.data&&e.ports[0].postMessage(_isVisible),"isOffline"===e.data&&e.ports[0].postMessage(_isOffline),"NotifyUserReqSaved"===e.data&&showMsg(" - "+_msgSync)})}function showMsg(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t="";_isOffline&&(t+=_msgOffline),""!==e&&(t+=e),document.getElementById("msgOffline").innerHTML=t,document.body.classList.add("state-offline")}function hideMsg(){document.body.classList.remove("state-offline")}document.addEventListener("visibilitychange",handleVisibilityChange,!1),function(){if("serviceWorker"in navigator){initConfig({swUrl:"sw/service-worker.js",msgOffline:"You're currently offline",msgWhenUpdate:'The contents of this page have been updated. Please <a href="javascript:location.reload()">reload</a>',askUserWhenSwUpdated:!1,msgSync:"Your submit is saved and will auto-submit when you're online",msgWhenSwUpdated:"New version available online. Do you want to update? ",preCache:"onReload"}),serviceWorkerRegistration().then(function(){listenToMessages(),setStyleSw(),setSwMsgContianer(),sendMsgChecksToSw()})}}();