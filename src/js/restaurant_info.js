/* ======= Import modules ======= */
import * as funcsHelpers from './functions';
import DBHelper from './dbhelper';
import SWRegistration from './sw-registration';
import Notificationbtn from './Notificationbtn';
import lazySizes from 'lazysizes';

/* ======= Model ======= */
let model = {
  restaurantId: null,
  currentMarker: null,
  swRegConfig: {},
  postDelay: false
};

/* ======= Controler ======= */
const controler = {
  init: function () {
    this.swRegistration();
                  
    this.dbHelper = new DBHelper();
    funcsHelpers.favoriteClickListener(this.dbHelper);

    lazySizes.init();
    view.init();

    /**
     * Initialize map as soon as the page is loaded.
     */
    document.addEventListener('DOMContentLoaded', () => {
      this.fillContent()  
    });
  },
  /**
   * sw registration
   */
  swRegistration: async function () {
    try {
      await SWRegistration.fire(model.swRegConfig);
        this.listenerForSwMsg();
        Notificationbtn.create();
    } catch (error) {
      console.log(error);
    }
  },
  /**
   * update content automatically when receive message from service worker
   */
  listenerForSwMsg: function () {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data === 'updateContent') {
        console.log('updateContent');
        this.fillContent()
        SWRegistration.showMsg('Content Updated')
      }
    });
  },
  fillContent: function () {
    // Fill restaurant content
    this.fillRestaurantContent();
    // Fill reviews content
    this.fillReviewsContent();
    // Listener for rating stars
    this.checkedRatingListener();
    // Listener for submit review
    this.submitReviewListener();
  },
  fillRestaurantContent: async function () {
    try {
    const restaurant = await this.fetchRestaurantFromURL();

      this.initMap(restaurant);
      view.fillBreadcrumb(restaurant.name);
      view.fillRestaurantHTML(restaurant);
    } catch (error) {
      view.showMsgInMainContent(error);
    } finally {
      funcsHelpers.showMainContent();
    }
  },
  fillReviewsContent: async function () {
    try {
      const reviews = await this.fetchReviewsFromURL();
        if (reviews) view.fillReviewsHTML(reviews);
    } catch (error) {
      console.log(error);
    }
  },
  /**
   * Initialize leaflet map
   */
  initMap: function (restaurant) {
    if (typeof L !== 'undefined') {
      const container = L.DomUtil.get('map');
      if (container !== null) container._leaflet_id = null;
      if (model.currentMarker !== null) model.currentMarker.remove();

      const newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: this.dbHelper.fetchMAPBOXToken(),
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      }).addTo(newMap);
      model.currentMarker = this.dbHelper.mapMarkerForRestaurant(restaurant, newMap);
    }
  },
  /**
   * Get current restaurant from page URL.
   */
  fetchRestaurantFromURL: async function () {
    const id = funcsHelpers.getParameterByName('id');
    if (!id) { // no id found in URL
      return Promise.reject('No restaurant id in URL');
    } else {
      try {
        const restaurant = await this.dbHelper.fetchRestaurantById(id);
        model.restaurantId = restaurant.id;
        return restaurant;
      } catch (error) {
        return Promise.reject(error);
      }
    }
  },
  /**
   * Get current reviews from restaurant page URL.
   */
  fetchReviewsFromURL: async function () {
    const id = funcsHelpers.getParameterByName('id');
    if (!id) { // no id found in URL
      return Promise.reject('No restaurant id in URL');
    } else {
      try {
        return await this.dbHelper.fetchReviewsByRestaurantId(id);
      } catch (error) {
        return Promise.reject(error);
      }
    }
  },
  /**
   * checked Rating Listener
   */
  checkedRatingListener: function () {
    const ratingRadioList = document.querySelectorAll('#frating input[name="rating"]');
    if (ratingRadioList.length === 0) return
    Array.from(ratingRadioList).map(function (ratingRadio) {
      ratingRadio.addEventListener('click', function () {
        this.checked = true
      })
    });
  },
  submitReviewListener: function () {
    console.log('submitReviewListener');
    document.getElementById('form-review').addEventListener('submit', (e) => {
    console.log('form-review');
      e.preventDefault();    //stop form from submitting
      e.stopImmediatePropagation();
      this.postReview();
      return false;
    });
  },
  /**
   * Post Review
   */
  postReview: async function () {

    // Avoid successive posts
    if (model.postDelay === true) {
      view.showFormValidationMsg('Please, avoid successive reviews');
      return
    }

    // Validation inputs
    let formValidationMsg = null;

    // Validation name input 
    if (view.getNameValue() === '') {
      formValidationMsg = 'Please, fill in the filed \'Name\',it is required';
    } else {
      if (view.getNameValue().length > 20) {
        formValidationMsg = 'The maximum characters allowed for the field \'Name\' is 20';
      } else if (view.getNameValue().length === 1) {
        formValidationMsg = 'Please, enter your real name, I do not think your name is One-Letter Name :)';
      }
    }

    // Validation review input
    if (view.getCommentValue() === '') {
      formValidationMsg = 'Please, fill in the filed \'Review\',it is required';
    } else {
      if (view.getCommentValue().length < 20) {
        formValidationMsg = 'Please, describe your opinion more, the minimum characters allowed for the field \'Review\' is 20';
      } else if (view.getCommentValue().length > 500) {
        formValidationMsg = 'Please, summarize your opinion more, the maximum characters allowed for the field \'Review\' is 500';
      }
    }
    
    // Show form validation message 
    if (formValidationMsg !== null) {
      view.showFormValidationMsg(formValidationMsg);
      return
    }

    // prepare the data to be post
    const review = {
      'restaurant_id': model.restaurantId,
      'name': view.getNameValue(),
      'rating': view.getRatingValue(),
      'comments': view.getCommentValue()
    }

    // if offline mention that review will be Stored locally
    if (navigator.onLine === false) review.storageLocal = 'Stored locally';

    // addition fetch options
    let options = {
      body: JSON.stringify(review)
    }

    // if offline allow sw post request
    if (navigator.onLine === false) options.mode = 'no-cors'

    try {
      const resReview = await this.dbHelper.postReview(options);
        view.createNewReview(resReview);
        view.initReviewForm();

        // Avoid successive posts, enable post review after 20 seconds
        model.postDelay = true;
        setTimeout(() => {
          model.postDelay = false;
        }, 20000);

    } catch (error) {
      console.log(error);
    }
  }
};

/* ======= View ======= */
const view = {
  init: function () {
    this.reviewsList = document.getElementById('reviews-list');
    this.fname = document.getElementById('fname');
    this.rating = document.getElementsByName('rating');
    this.fcomment = document.getElementById('fcomment');
    this.ratingRadioList = document.querySelectorAll('#frating input[name="rating"]');
    this.formValidationMsg = document.getElementById('validattion-message');
  },
  /**
   * init review form inputs
   */
  initReviewForm: function () {
    this.fname.value = '';
    this.rating[4].checked = true;
    this.fcomment.value = '';
    this.hideFormValidationMsg();
  },
  /**
   * Show form validation message
   * @param {String} msg 
   */
  showFormValidationMsg: function (msg) {
    this.formValidationMsg.innerHTML = msg;
    this.formValidationMsg.style.display = 'block';
  },
  /**
   * Hide form validation message
   */
  hideFormValidationMsg: function () {
    this.formValidationMsg.style.display = 'none';
    this.formValidationMsg.innerHTML = '';
  },
  /**
   * get rating value
   */
  getRatingValue: function () {
    let rating;
    // to support Foreach over Nodelist in Ie11
    funcsHelpers.polyfillIe11NodelistForeach();
    
    this.ratingRadioList.forEach(ratingRadio => {
      if (ratingRadio.checked) rating = ratingRadio.value;
    });

    return rating;
  },
  /**
   * get comment value
   */
  getCommentValue: function () {
    return this.fcomment.value.trim();
  },
  /**
   * get name value
   */
  getNameValue: function () {
    return this.fname.value.trim();
  },
  /**
   * create new review by adding it to reviews list section
   * @param {*} review 
   */
  createNewReview: function (review) {
    this.reviewsList.appendChild(this.createReviewHTML(review));  
  },
  /**
   * Create restaurant HTML and add it to the webpage
   */
  fillRestaurantHTML: function (restaurant) {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const image = document.getElementById('restaurant-img');
    image.setAttribute('alt', restaurant.name);
    image.className = 'restaurant-img lazyload blur-up';
    image.setAttribute('data-srcset', controler.dbHelper.srcsetImageUrlForRestaurant(restaurant));
    image.setAttribute('data-src', controler.dbHelper.imageUrlForRestaurant(restaurant));
    image.setAttribute('data-sizes', '(max-width: 380px) 300px, (max-width: 480px) 400px, (max-width: 680px) 600px, (max-width: 768px) 800px, (max-width: 960px) 400px, (max-width: 1360px) 600px');

    const btnClassName = 'favorite-icon'
    const btnFavorite = document.querySelector(`.${btnClassName}`);
    const isFavorite = restaurant.is_favorite.toString() === 'true' ? true : false;
    btnFavorite.setAttribute('aria-checked', isFavorite);
    btnFavorite.setAttribute('id', `fav-${restaurant.id}`);
    btnFavorite.classList.remove(`${btnClassName}--on`, `${btnClassName}--off`);
    btnFavorite.classList.add(`${btnClassName}--${isFavorite ? 'on' : 'off'}`);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
      this.fillRestaurantHoursHTML(restaurant.operating_hours);
    }

  },
  /**
   * Create restaurant operating hours HTML table and add it to the webpage.
   */
  fillRestaurantHoursHTML: function (operatingHours) {
    const hours = document.getElementById('restaurant-hours');
    hours.innerHTML = ''
    for (let key in operatingHours) {
      const row = document.createElement('tr');
      row.setAttribute('tabindex', '0');
      
      const day = document.createElement('td');
      day.innerHTML = key;
      row.appendChild(day);

      const time = document.createElement('td');
      time.innerHTML = operatingHours[key];
      row.appendChild(time);

      hours.appendChild(row);
    }
  },
  /**
   * Create all reviews HTML and add them to the webpage.
   */
  fillReviewsHTML: function (reviews) {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    const ul = document.getElementById('reviews-list');
    if (!ul) return;

    ul.innerHTML = ''

    if (reviews.length === 0 || !reviews) {
      const reviewsMsgContainer = document.createElement('p');
      const reviewsMsg = navigator.onLine === false ? 'No reviews available offline. You can post offline ,your reviews will saved offline & auto-submit when you\'re online' : 'No reviews yet. Be the first one to write a review.';
      reviewsMsgContainer.innerHTML = reviewsMsg;
      reviewsMsgContainer.id = 'reviewsMsgContainer'
      container.appendChild(reviewsMsgContainer);
      container.appendChild(ul);
      return;
    }

    if (reviews.length > 1) {
      const frag = document.createDocumentFragment();
      reviews.map(review => {
        frag.appendChild(this.createReviewHTML(review));
      });
      ul.appendChild(frag);
    } else {
      ul.appendChild(this.createReviewHTML(reviews));
    }

    container.appendChild(ul);
  },
  /**
   * Create review HTML and add it to the webpage.
   */
  createReviewHTML: function (review) {
    const reviewsMsgContainer = document.getElementById('reviewsMsgContainer')
    if (navigator.onLine === false && reviewsMsgContainer !== null) {
      const reviewsMsg = 'You can post offline ,your reviews will saved offline & auto-submit when you\'re online';
      reviewsMsgContainer.innerHTML = reviewsMsg;
    }

    const li = document.createElement('li');
    li.classList.add('fadein');
    li.setAttribute('tabindex', '0');
    const reviewHeader = document.createElement('div');
    reviewHeader.className = 'review-header'

    const name = document.createElement('p');
    name.setAttribute('tabindex', '0');
    name.innerHTML = review.name;
    name.className = 'name'
    reviewHeader.appendChild(name);

    const date = document.createElement('p');
    // format Exp: October 26, 2016
    var dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    date.innerHTML = review.updatedAt ? new Date(review.updatedAt).toLocaleDateString('en-US', dateOptions) : review.storageLocal;
    date.className = 'date'
    reviewHeader.appendChild(date);

    li.appendChild(reviewHeader);
    let ratingContainer = document.createElement('div');
    ratingContainer.className = 'rating'
    for (let i = 1; i <= 5; i++) {
      const rating = document.createElement('span');
      rating.innerHTML = review.rating >= i ? '★' : '☆';
      rating.className = review.rating >= i ? 'icon--active' : 'icon'
      ratingContainer.appendChild(rating);
    }
    li.appendChild(ratingContainer);

    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    comments.className = 'comment'
    li.appendChild(comments);

    return li;
  },
  /**
   * Add restaurant name to the breadcrumb navigation menu
   */
  fillBreadcrumb: function (restaurantName) {
    const currentPageName = document.getElementById('current-page-name')
    if (currentPageName !== null) {
      if (currentPageName.innerHTML !== restaurantName)
        currentPageName.innerHTML = restaurantName
        
      return
    }

    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.id = 'current-page-name'
    li.innerHTML = restaurantName;
    breadcrumb.appendChild(li);
  },
  showMsgInMainContent: function (msg) {
    document.getElementById('maincontent').innerHTML = `<section class="maincontent-msg"><h1>${msg}</h1></section>`;
  }
};

/* ======= Fire ======= */
controler.init();