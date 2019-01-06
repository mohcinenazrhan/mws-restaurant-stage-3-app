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
  swRegConfig: {}
};

/* ======= Controler ======= */
const controler = {
  init: function () {
    this.swRegistration();
                  
    this.dbHelper = new DBHelper();
    funcsHelpers.favoriteClickListener(this.dbHelper);

    lazySizes.init();

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
    if (!restaurant || restaurant.length === 0) {
      console.log('No restaurant found');
      return
    }

      this.initMap(restaurant);
      view.fillBreadcrumb(restaurant.name);
      view.fillRestaurantHTML(restaurant);
    } catch (error) {
      console.log(error);
    } finally {
      funcsHelpers.showMainContent();
    }
  },
  fillReviewsContent: async function () {
    try {
      const reviews = await this.fetchReviewsFromURL();
        view.fillReviewsHTML(reviews);
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
        console.log(error);
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
        console.log(error);
      }
    }
  },
  /**
   * checked Rating Listener
   */
  checkedRatingListener: function () {
    const ratingRadioList = document.querySelectorAll('#frating input[name="rating"]');
    if (ratingRadioList.length === 0) return
    Array.from(ratingRadioList).forEach(function (ratingRadio) {
      ratingRadio.addEventListener('click', function () {
        this.checked = true
      })
    });
  },
  submitReviewListener: function () {
    console.log('submitReviewListener');
    document.querySelector('#form-review').addEventListener('submit', (e) => {
      e.preventDefault();    //stop form from submitting
      this.postReview();
    });
  },
  /**
   * Post Review
   */
  postReview: async function () {
    console.log('postReview');
    
    let rating;

    // to support Foreach over Nodelist in Ie11
    funcsHelpers.polyfillIe11NodelistForeach();
    const ratingRadioList = document.querySelectorAll('#frating input[name="rating"]');
    ratingRadioList.forEach(ratingRadio => {
      if (ratingRadio.checked) rating = ratingRadio.value;
    });

    const review = {
      'restaurant_id': model.restaurantId,
      'name': document.getElementById('fname').value,
      'rating': rating,
      'comments': document.getElementById('fcomment').value
    }

    // if offline mention that review will be Stored locally
    if (navigator.onLine === false) review.storageLocal = 'Stored locally';

    let options = {
      body: JSON.stringify(review)
    }

    // if offline allow sw post request
    if (navigator.onLine === false) options.mode = 'no-cors'

    try {
      const resReview = await this.dbHelper.postReview(options);
      
        document.getElementById('reviews-list').appendChild(view.createReviewHTML(resReview));
        document.getElementById('fname').value = '';
        document.getElementsByName('rating')[4].checked = true;
        document.getElementById('fcomment').value = '';
    } catch (error) {
      console.log(error);
    }
  }
};

/* ======= View ======= */
const view = {
  init: function () {
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

    const ul = document.getElementById('reviews-list');
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
      reviews.forEach(review => {
        ul.appendChild(this.createReviewHTML(review));
      });
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
  }
};

/* ======= Fire ======= */
controler.init();