var board = require("tnt.board");
var apijs = require("tnt.api");
var ensemblRestAPI = require("tnt.ensembl");

// A predefined track for genes
var data_gene = function () {
//board.track.data.gene = function () {

    var track = board.track.data();
    // .index("ID");

    var updater = board.track.data.retriever.ensembl()
        .endpoint("region")
    // TODO: If success is defined here, means that it can't be user-defined
    // is that good? enough? API?
    // UPDATE: Now success is backed up by an array. Still don't know if this is the best option
        .success(function(genes) {
	    for (var i = 0; i < genes.length; i++) {
		if (genes[i].strand === -1) {
		    genes[i].display_label = "<" + genes[i].external_name;
		} else {
		    genes[i].display_label = genes[i].external_name + ">";
		}
	    }
	});

    return track.update(updater);
}

module.exports = exports = data_gene;
