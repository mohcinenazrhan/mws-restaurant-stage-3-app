const gulp         = require('gulp'),
      gulpLoadPlugins = require('gulp-load-plugins')
      uglify       = require('gulp-uglify-es').default,
      sass         = require('gulp-sass'),
      autoprefixer = require('gulp-autoprefixer'),
      uglifycss    = require('gulp-uglifycss'),
      plumber      = require('gulp-plumber'),
      babel        = require('gulp-babel'),
      concat       = require('gulp-concat'),
      browserSync  = require('browser-sync').create(),
      htmlmin      = require('gulp-htmlmin'),
      clean        = require('gulp-clean'),
      replace      = require('gulp-string-replace'),
      responsive   = require('gulp-responsive'),
      sourcemaps   = require('gulp-sourcemaps'),
      browserify   = require('browserify'),
      babelify     = require('babelify'),
      source       = require('vinyl-source-stream'),
      buffer       = require('vinyl-buffer'),
      runSequence  = require('run-sequence'),
      rev          = require('gulp-rev'),
      fs           = require('fs'),
      file         = require('gulp-file'),
      path         = require('path'),
      swPrecache   = require('sw-precache');

const reload = browserSync.reload,
    $ = gulpLoadPlugins(),
    devAPIOrigin = 'http://localhost:1337',
    prodAPIOrigin = 'https://mnaz-restaurant-reviews-api.herokuapp.com';

let dev = true,
rootDir = dev ? '.temp' : 'dist';

/////////////////////////////// Watch Mode : .temp ///////////////////////////////

gulp.task('serve-only', function () {

    browserSync.init({
        open: false,
        server: {
            baseDir: './.temp',
            middleware: [{
                route: '/sw/service-worker.js',
                handle: function (req, res, next) {
                    res.setHeader('Service-Worker-Allowed', '/');
                    next();
                }
            }]
        }
    });

    gulp.watch('src/sass/*.scss', ['styles']);
    gulp.watch('src/js/*.js', ['scripts']);
    gulp.watch('src/sw/sw-handler.js', ['service-worker']);
    gulp.watch('src/*.html', ['html']).on('change', reload);
});

gulp.task('watch', ['scripts', 'styles', 'html'], function () {

    browserSync.init({
        server: {
            baseDir: './.temp',
            middleware: [{
                route: '/sw/service-worker.js',
                handle: function (req, res, next) {
                    res.setHeader('Service-Worker-Allowed', '/');
                    next();
                }
            }]
        }
    });

    gulp.watch('src/sass/*.scss', ['styles']);
    gulp.watch('src/js/*.js', ['scripts']);
    gulp.watch('src/sw/sw-handler.js', ['service-worker']);
    gulp.watch('src/*.html', ['html']).on('change', reload);
});

// styles .scss
gulp.task('styles', function () {
    return gulp.src('src/sass/*.scss')
        .pipe($.if(dev, $.sourcemaps.init()))
        .pipe(sass({
            includePaths: require('node-normalize-scss').includePaths
        }))
        .pipe(plumber())
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('style.css'))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: true
        }))
        .pipe($.if(dev, $.sourcemaps.write(), uglifycss()))
        // .pipe($.if(!dev, rev()))
        .pipe($.if(dev, gulp.dest('.temp/css'), gulp.dest('dist/css')))
        .pipe(reload({
            stream: true
        }));
});

// ESLint
gulp.task('lint', function () {
    return gulp.src('src/js/**/*.js')
        .pipe($.eslint({
            fix: true
        }))
        .pipe(reload({
            stream: true,
            once: true
        }))
        .pipe($.eslint.format())
        .pipe($.if(!browserSync.active, $.eslint.failAfterError()))
        // .pipe(gulp.dest('src/js/'));
});

// scripts .js
gulp.task('scripts', ['lint'], function () {
    const files = ['main', 'restaurant_info']
    return files.map((file) => {
        return browserify(`src/js/${file}.js`, {
                debug: true
            })
            .transform(babelify, {
                sourceMaps: dev ? true : false
            }) // required for 'import'
            .bundle()
            .pipe(source(`${file}.js`))
            .pipe(buffer()) // required to use stream w/ other plugins
            .pipe($.if(dev, replace('APIORIGIN', devAPIOrigin), replace('APIORIGIN', prodAPIOrigin)))
            .pipe($.if(!dev, uglify()))
            .pipe($.if(dev, gulp.dest('.temp/js'), gulp.dest('dist/js')))
            .pipe(reload({
                stream: true
            }))
    })
});

// Copy html files
gulp.task('html', function () {
    return gulp.src('src/*.html')
        .pipe($.if(!dev, htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: {
                compress: {
                    drop_console: true
                }
            },
            processConditionalComments: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
        })))
        .pipe($.if(dev, gulp.dest('.temp/'), gulp.dest('dist/')))
})

// Generates responsive images
gulp.task('offlineimgs', function () {
    const folder = 'offlineimgs';
    return gulp.src(`src/${folder}/*.{png,jpg}`)
               .pipe($.if(dev, gulp.dest(`.temp/${folder}`), gulp.dest(`dist/${folder}`)))
});

// Generates responsive images
gulp.task('res-images', function () {
    return gulp.src('src/img/*.{png,jpg}')
        .pipe(responsive({
            '*.jpg': [{
                width: 300,
                rename: {
                    suffix: '-300'
                },
            }, {
                width: 400,
                rename: {
                    suffix: '-400'
                },
            }, {
                width: 600,
                rename: {
                    suffix: '-600_2x'
                },
            }, {
                width: 800,
                rename: {
                    suffix: '-800_2x'
                },
            }, {
                rename: {
                    suffix: ''
                }
            }],
        }, {
            // Global configuration for all images
            // The output quality for JPEG, WebP and TIFF output formats
            quality: 60,
            // Use progressive (interlace) scan for JPEG and PNG output
            progressive: true,
            // Strip all metadata
            withMetadata: false,
        }))
        .pipe($.if(dev, gulp.dest('.temp/img'), gulp.dest('dist/img')))
});

// Copy PWA files
gulp.task('pwafiles', function () {
    return gulp.src(['src/manifest.json', 'src/pwaicons/**/*.*'], {
        base: './src'
    })
    .pipe($.if(dev, gulp.dest('.temp/'), gulp.dest('dist/')))
});

// Clean temp directory
gulp.task('clean', function () {
    return gulp.src(dev ? '.temp' : 'dist', {
        read: false
    }).pipe(clean())
});

gulp.task('serve', () => {
    runSequence(['clean'], ['watch', 'res-images', 'offlineimgs', 'pwafiles'], ['service-worker'])
})

/////////////////////////////// Build for Prod : Dist ///////////////////////////////

gulp.task('serve-prod', function () {

    browserSync.init({
        open: false,
        port: 8080,
        server: {
            baseDir: './dist',
            middleware: [{
                route: '/sw/service-worker.js',
                handle: function (req, res, next) {
                    res.setHeader('Service-Worker-Allowed', '/');
                    next();
                }
            }]
        }
    });
});


gulp.task('build', ['scripts', 'styles', 'html', 'res-images', 'pwafiles'], () => {
    return gulp.src('dist/**/*').pipe($.size({
        title: 'build',
        gzip: true
    }));
});

gulp.task('bundles', function () {
    return gulp.src(['dist/js/*.js', 'dist/css/*.css'], {
            base: 'dist'
        })
        .pipe(rev())
        .pipe(gulp.dest('dist/'))
        .pipe(rev.manifest({
            merge: true
        }))
        .pipe(gulp.dest('dist/'))
});

gulp.task('fixbundles', function () {

    const revs = JSON.parse(fs.readFileSync('dist/rev-manifest.json'));
    let src = gulp.src(['dist/*.html'])
    for (const rev in revs) {
        src.pipe(replace(rev, revs[rev]))
    }
    src.pipe(gulp.dest('dist/'))

    for (const rev in revs) {
        fs.unlink(`dist/${rev}`)
    }
    
    fs.unlink('dist/rev-manifest.json')
});

gulp.task('default', () => {
    return new Promise(resolve => {
        dev = false;
        rootDir = dev ? '.temp' : 'dist';
        runSequence('clean', 'build', 'bundles', 'fixbundles', 'service-worker', resolve);
    });
});


////////////////////////////////// Service Worker //////////////////////////////////

gulp.task('generate-service-worker', function (callback) {
    swPrecache.write(`${rootDir}/sw/service-worker.js`, {
        staticFileGlobs: [rootDir + '/**/*.{js,html,css,eot,ttf,woff}', rootDir + '/offlineimgs/*.{png,jpg,gif,svg}'],
        stripPrefix: rootDir,
        handleFetch: false,
        skipWaiting: false
    }, callback);
});

gulp.task('prepare-sw', ['generate-service-worker'], function () {
    return gulp.src([`${rootDir}/sw/service-worker.js`, 'src/sw/sw-handler.js'])
        .pipe(plumber())
        .pipe(concat('service-worker.js'))
        .pipe($.if(dev, gulp.dest('.temp/sw'), gulp.dest('dist/sw')))
})

gulp.task('service-worker', ['prepare-sw'], function () {
    const bundler = browserify(`${rootDir}/sw/service-worker.js`, {
        debug: true
    }); // ['1.js', '2.js']

    return bundler
        .transform(babelify, {
            presets: ['@babel/preset-env'],
            sourceMaps: dev ? true : false
        }) // required for 'import'
        .bundle()
        .pipe(source('service-worker.js')) // get text stream w/ destination filename
        .pipe(buffer()) // required to use stream w/ other plugins
        .pipe($.if(dev, replace('APIORIGIN', devAPIOrigin), replace('APIORIGIN', prodAPIOrigin)))
        .pipe($.if(!dev, uglify()))
        .pipe($.if(dev, gulp.dest('.temp/sw'), gulp.dest('dist/sw')))

})