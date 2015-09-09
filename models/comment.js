var mongoose = require("mongoose"),
	Schema = mongoose.Schema;

var User = require("./user.js");

var CommentSchema = new Schema({
	createdAt: Date,
	comments: {type: String, require: true},
	author: {type: String, require: true}
});

var Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;