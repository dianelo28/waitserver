var mongoose = require("mongoose"),
	Schema = mongoose.Schema;

var Comment = require("./comment.js");

var BusinessSchema = new Schema({
	business_id: {type: String, require: true},
	twoWait:  {
		wait: String,
		updatedAt: String
	},
	fourWait: {
		wait: String,
		updatedAt: String
	},
	fiveWait: {
		wait: String,
		updatedAt: String
	},
	comments: [Comment.schema]
});

var Business = mongoose.model("Business", BusinessSchema);

module.exports = Business;