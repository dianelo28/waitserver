var mongoose = require("mongoose"),
	Schema = mongoose.Schema;

var Comment = require("./comment.js");

var BusinessSchema = new Schema({
	business_id: {type: String, require: true},
	twoWait: {type: String, default: 0},
	fourWait: {type: String, default: 0},
	fiveWait: {type: String, default: 0},
	comments: [Comment.schema]
});

var Business = mongoose.model("Business", BusinessSchema);

module.exports = Business;