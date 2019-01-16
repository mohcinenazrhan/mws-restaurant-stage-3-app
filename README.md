# MWS Restaurant Reviews

Restaurant Reviews project is a capstone project in the Mobile Web Specialist program provided by Udacity.
[Lighthouse test](https://lighthouse-dot-webdotdevsite.appspot.com/lh/html?url=https://flamboyant-ride-d09151.netlify.com/)
[Page speed test](https://developers.google.com/speed/pagespeed/insights/?url=https%3A%2F%2Fflamboyant-ride-d09151.netlify.com%2F)

## Project Overview
Restaurant Reviews project is a capstone project in the Mobile Web Specialist nanodegree program provided by Udacity divided into 3 stages, the idea is to improve an existing application at every step by adding new features and solving problems.

[The starter code](https://github.com/udacity/mws-restaurant-stage-1) (The existing application)
“You have been provided the code for a restaurant reviews website. The code has a lot of issues. It’s barely usable on a desktop browser, much less a mobile device. It also doesn’t include any standard accessibility features, and it doesn’t work offline at all. Your job is to update the code to resolve these issues while still maintaining the included functionality.”

Stages repository:
[Stage 1](https://github.com/mohcinenazrhan/mws-restaurant-stage-1), [Stage 2](https://github.com/mohcinenazrhan/mws-restaurant-stage-2-app) and this is the [Stage 3](https://github.com/mohcinenazrhan/mws-restaurant-stage-3-app)

Project **stage-3** requirements: [The app live V1](https://goo.gl/c7Jq5h)
 - add a form to allow users to submit their own reviews;
 - add functionality to defer submission of the form until connection is re-established;
 - achieve *Lighthouse* performance scores:
    1. **Progressive Web App** score - at 90 or better.
    2. **Performance** score  - at 90 or better.
    3. **Accessibility** score - at 90 or better.

Project features implemented at the **stage-3**:
 - the user can mark / unmark a restaurant as favorite;
 - the user can submit a review for the restaurant (online / offline) and the review is displayed immediately;
 - the app notifies the user, if there is no connection after the form submission;
 - the user review is sent when the connection is re-established;
 - pages accessed by the user online are available offline.

Addition improvement: [The app live V2](https://goo.gl/o6m8kY)
-	The API is hosted in a free Heroku plan (SLEEPS AFTER 30 MINS OF INACTIVITY) so the response will take a long time and deny the app benefit from the local DB data.
The solution is to change strategy of response data in service worker to adapt with API server when sleeps, the new strategy is to first response from local DB then go get updated data from API to compare it with the local DB data if there is a change the app updates the content automatically and update the local DB data.
-	Refactor the app code to make clean and clear for future update and maintain by:
o	Adopt ES2015  syntax and ES2017 async/await.
o	Take advantage of OOP and MVC to improve the code structure.
-	Make the app support IE 11.
-	If reviews are posted offline and the user not in the website or the browser is closed, when the user back online push notification to let the user know that the reviews posted offline is successfully submitted to the server.
-	Add notification button to display the blocked or authorized notifications status with instruction to enable or disable it.
-	Add lazy loader for images (responsive and normal) to make the app load fast.
-	Create background sync polyfill for browsers that does support service worker but does not support background sync yet exp: Mozilla Firefox

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development.

### Prerequisites

You first need a copy of the code in your local machine, make sure to fork and clone, you can clone by running this command.

Create a directory where the app resides (name it whatever you'd like)
```
mkdir restaurant-app && cd restaurant-app
```

Clone the app
```
git clone https://github.com/mohcinenazrhan/mws-restaurant-stage-3-app.git
```

The `restaurant-app/` app depends on tokens.js to get MAPBOX_TOKEN:
```
$ cd restaurant-app
$ touch tokens.js
```
Open the file and fill it these variables:
```
# mapbox api key (required)
export default {
    MAPBOX_TOKEN: ''
}
```

You also need to have the local dev server from which your app receives data. You can check the [dev server's docs](https://github.com/mohcinenazrhan/mws-restaurant-stage-3) for more information.
The `restaurant-app/` app depends on env.json to get dev and prod API ORIGIN:
```
$ cd restaurant-app
$ touch env.json
```
Open the file and fill it these variables:
```
# devAPIOrigin & prodAPIOrigin (required) Exp: http://localhost:1337
{
    "devAPIOrigin": "",
    "prodAPIOrigin": ""
}
```

### Installing

#### Install dependencies

To get up and running all you need to do is install the dependencies.

```
npm install
```

**Note**: Make sure you are inside the project directory.

#### Quick Start

To quickly generate the optimized assets and run server, run:
```bash
gulp prod
then
gulp serve-prod-only
```

More details in the following sections.

#### Run task runner

Run the default task to generate files for production

```bash
gulp prod
```

Run serve task to generate files + live editing (with browser-sync):

```
gulp
```

## Running the tests

No tests available.

## Built With

* [npm](https://npmjs.com) - Dependency Management
* [https://gulpjs.com/](Gulp) - Used task runner
* [https://babeljs.io/](Babel) - Used to compile ES2015 to ES5

## Starter Code Owners

* [@forbiddenvoid](https://github.com/udacity/mws-restaurant-stage-1/commits?author=forbiddenvoid)
* @hbkwong

## License

No license.

## Acknowledgments

* Thanks to ALC and Udacity for giving us the chance to learn new things
* Thanks to instructors and reviewers for being helpful and patient with us