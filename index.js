var through = require('through2');
var frontMatter = require('front-matter');
var PluginError = require('gulp-util').PluginError;
var File = require('vinyl');
var path = require('path');
var hljs = require('highlight.js');

var pageIndex = [];

var markdownit = require('markdown-it')({
  highlight: function(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value;
      } catch (err) {
        console.log(err.toString());
      }
    }

    try {
      return hljs.highlightAuto(str).value;
    } catch (err) {
      console.log(err.toString());
    }

    return '';
  }
});

function gulpFlatBlog(templates) {
  if (!templates.single || !templates.index) {
    throw new PluginError('gulp-flat-blog', 'Missing template.');
  }

  var posts = [];
  var finalposts = [];


  function singlePost(file, encoding, callback) {

    if (file.isStream()) {
      this.emit('error', new PluginError('gulp-flat-blog',
        'Streams are not supported.'));
      return callback();
    }

    if (file.isBuffer()) {

      var post = frontMatter(file.contents.toString());
      post.body = markdownit.render(post.body);

      for (var key in post.attributes) {
          post[key] = post.attributes[key];
      }
      delete post.attributes;

      if (!post.hasOwnProperty('slug')) {
        post.slug = file.relative.substring(0, file.relative.lastIndexOf('.'));
      }

      // post.createdAt = file.stat.birthtime;
      post.createdAt = post.pubdate;
      post.updatedAt = file.stat.mtime;
      posts.push(post);

      file.contents = new Buffer(templates.single({post: post}));
      file.path = path.join(file.base, post.slug + '.html');

    }
    this.push(file);
    callback();
  }


  function allPosts(callback) {

    posts.sort(function(lhs, rhs) {

      return new Date(rhs.date ? rhs.date : rhs.pubdate) - new Date(
        lhs.date ? lhs.date : lhs.pubdate);
    });

    var file = new File({
      path: 'index.html'
    });

    file.contents = new Buffer(templates.index({
      posts: posts
    }));

    var vars = {};

    for (i in posts) {
        vars['file' + i] = new File({path: 'single.html'});

        vars['file' + i].contents = new Buffer(templates.single({post: posts[i], posts: posts}));
        vars['file' + i].path = path.join(vars['file' + i].base, posts[i].slug + '.html');
        this.push(vars['file' + i]);
    }

    this.push(file);
    callback();
  }

  return through.obj(singlePost, allPosts);
};

module.exports = gulpFlatBlog;
