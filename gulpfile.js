// npm init -y && npm install -D browser-sync gulp-file-include gulp-pug del gulp-dart-sass gulp-autoprefixer gulp-group-css-media-queries gulp-clean-css gulp-rename gulp-babel @babel/core @babel/preset-env gulp-uglify-es gulp-htmlmin gulp-imagemin gulp-webp gulp-webp-html gulp-webp-css gulp-ttf2woff gulp-ttf2woff2 gulp-fonter
const { src, dest, task, series, parallel, watch } = require('gulp');
const fs = require('fs');
const cleanBuildFolder = require('del');
const rename = require('gulp-rename');
const browserSync = require('browser-sync').create();

const webpHtml = require('gulp-webp-html');
const htmlMin = require('gulp-htmlmin');
const pug = require('gulp-pug');
const fileInclude = require('gulp-file-include');

const sass = require('gulp-dart-sass');
const prefixer = require('gulp-autoprefixer');
const groupMediaQueries = require('gulp-group-css-media-queries');
const cleanCss = require('gulp-clean-css');

const babel = require('gulp-babel');
const uglifyES = require('gulp-uglify-es').default;

const imageMin = require('gulp-imagemin');
const webp = require('gulp-webp');
const webpCss = require('gulp-webp-css');

const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');
const fonter = require('gulp-fonter');

const srcFolderName = 'src';
const buildFolderName = 'build';

const path = {
  build: {
    html: `${buildFolderName}/`,
    css: `${buildFolderName}/css/`,
    js: `${buildFolderName}/js/`,
    img: `${buildFolderName}/img/`,
    fonts: `${buildFolderName}/fonts/`,
  },
  src: {
    html: [`${srcFolderName}/html/*.html`, `!${srcFolderName}/html/_*.html`],
    pug: [`${srcFolderName}/pug/*.pug`, `!${srcFolderName}/pug/_*.pug`],
    css: `${srcFolderName}/scss/style.scss`,
    js: `${srcFolderName}/js/script.js`,
    img: `${srcFolderName}/img/**/*.{jpg,png,svg,gif,ico,webp}`,
    fonts: `${srcFolderName}/fonts/*.ttf`,
  },
  watch: {
    html: `${srcFolderName}/**/*.html`,
    pug: `${srcFolderName}/**/*.pug`,
    css: `${srcFolderName}/scss/**/*.scss`,
    js: `${srcFolderName}/js/**/*.js`,
    img: `${srcFolderName}/img/**/*.{jpg,png,svg,gif,ico,webp}`,
  },
};

const browserSyncTask = (params) => {
  browserSync.init({
    server: {
      baseDir: `./${buildFolderName}/`,
    },
    port: 3000,
    notify: false,
    browser: ['google-chrome-stable'],
  });
};

const cleanBuildFolderTask = (params) => {
  return cleanBuildFolder(`./${buildFolderName}/`);
};

const htmlTask = () => {
  return src(path.src.html)
    .pipe(webpHtml())
    .pipe(
      htmlMin({
        collapseWhitespace: true,
      })
    )
    .pipe(dest(path.build.html))
    .pipe(browserSync.stream());
};

const pugTask = () => {
  return src(path.src.pug)
    .pipe(pug({ pretty: true }))
    .pipe(webpHtml())
    .pipe(
      htmlMin({
        collapseWhitespace: true,
      })
    )
    .pipe(dest(path.build.html))
    .pipe(browserSync.stream());
};

const sassTask = () => {
  return src(path.src.css)
    .pipe(sass({ outputStyle: 'expanded' }))
    .pipe(prefixer('last 5 versions'))
    .pipe(groupMediaQueries())
    .pipe(webpCss())
    .pipe(dest(path.build.css))
    .pipe(cleanCss())
    .pipe(rename({ extname: '.min.css' }))
    .pipe(dest(path.build.css))
    .pipe(browserSync.stream());
};

const jsTask = () => {
  return src(path.src.js)
    .pipe(fileInclude())
    .pipe(
      babel({
        presets: ['@babel/env'],
      })
    )
    .pipe(dest(path.build.js))
    .pipe(uglifyES())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(dest(path.build.js))
    .pipe(browserSync.stream());
};

const imgTask = () => {
  return src(path.src.img)
    .pipe(
      webp({
        quality: 70,
      })
    )
    .pipe(dest(path.build.img))
    .pipe(src(path.src.img))
    .pipe(
      imageMin({
        progressive: true,
        svgoPlugins: [{ removeViewBox: false }],
        interlaced: true,
        optimizationLevel: 3,
      })
    )
    .pipe(dest(path.build.img))
    .pipe(browserSync.stream());
};

const fontsTransformTask = () => {
  src(path.src.fonts).pipe(ttf2woff()).pipe(dest(path.build.fonts));
  return src(path.src.fonts)
    .pipe(ttf2woff2())
    .pipe(dest(path.build.fonts))
    .pipe(browserSync.stream());
};

const fontsConnectToStyleTask = (params) => {
  let file_content = fs.readFileSync(srcFolderName + '/scss/_fonts.scss');
  if (file_content == '') {
    fs.writeFile(srcFolderName + '/scss/_fonts.scss', '', cb);
    return fs.readdir(path.build.fonts, (err, items) => {
      if (items) {
        let c_fontname;
        for (var i = 0; i < items.length; i++) {
          let fontname = items[i].split('.');
          fontname = fontname[0];
          if (c_fontname != fontname) {
            fs.appendFile(
              srcFolderName + '/scss/_fonts.scss',
              '@include fontFaceGenerate("' +
                fontname +
                '", "' +
                fontname +
                '", "400", "normal");\r\n',
              cb
            );
          }
          c_fontname = fontname;
        }
      }
    });
  }
};
const cb = () => {};

task('otf2ttf', () => {
  return src([`${srcFolderName}/fonts/*.otf`]).pipe(
    fonter({
      format: ['ttf'],
    }).pipe(dest(`${srcFolderName}/fonts/`))
  );
});

const watchersTask = (params) => {
  // watch([path.watch.html], htmlTask);
  watch([path.watch.pug], pugTask);
  watch([path.watch.css], sassTask);
  watch([path.watch.js], jsTask);
  watch([path.watch.img], imgTask);
};

const buildTasksSet = series(
  cleanBuildFolderTask,
  parallel(pugTask, sassTask, jsTask, imgTask, fontsTransformTask),
  fontsConnectToStyleTask
);
const watchTasksSet = parallel(watchersTask, browserSyncTask);
const defaultTasksSet = parallel(buildTasksSet, watchTasksSet);

exports.html = htmlTask;
exports.pug = pugTask;
exports.css = sassTask;
exports.js = jsTask;
exports.images = imgTask;
exports.fonts = fontsTransformTask;
exports.fontsStyle = fontsConnectToStyleTask;
exports.build = buildTasksSet;
exports.watch = watchTasksSet;
exports.default = defaultTasksSet;
