var gulp = require('gulp');
var htmlmin = require('gulp-htmlmin');

gulp.task('minify', function() {
  return gulp.src(['./dist/**/*.html'])
    .pipe(htmlmin({
      collapseWhitespace: true,
      minifyJS: true,
      minifyCSS: true,
      processScripts: ['text/javascript']
    }))
    .pipe(gulp.dest('./out'));
});