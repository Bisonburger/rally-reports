var gulp = require('gulp');
var runSequence = require('run-sequence');

gulp.task('build', function() {
  runSequence('inline','minify');
});
