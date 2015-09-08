var mongoose = require("mongoose"),
	Schema = mongoose.Schema;

var Comment = require("./comment.js");

var BusinessSchema = new Schema({
	business_id: {type: String, require: true},
	twoWait: String,
	fourWait: String,
	fiveWait: String,
	comments: [Comment.schema]
});

var Business = mongoose.model("Business", BusinessSchema);

module.exports = Business;