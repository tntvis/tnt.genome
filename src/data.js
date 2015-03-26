var board = require("tnt.board");
var apijs = require("tnt.api");
var ensemblRestAPI = require("tnt.ensembl");

// A predefined track for genes
var data_gene = function () {
//board.track.data.gene = function () {

    var track = board.track.data();
    // .index("ID");

    board.track.data.retriever.ensembl = function () {
	var success = [function () {}];
	var endpoint;
	var eRest = ensemblRestAPI();
	var update_track = function (obj) {
	    var data_parent = this;
	    // Object has loc and a plug-in defined callback
	    var loc = obj.loc;
	    var plugin_cbak = obj.on_success;
	    eRest.call({
		url: eRest.url[update_track.endpoint()](loc),
		success: function (resp) {
		    data_parent.elements(resp);

		    // User defined
		    for (var i=0; i<success.length; i++) {
			success[i](resp);
		    }

		    // plug-in defined
		    plugin_cbak();
		}
	    });
	};
	apijs (update_track)
	    .getset ('endpoint');

	// TODO: We don't have a way of resetting the success array
	// TODO: Should this also be included in the sync retriever?
	// Still not sure this is the best option to support more than one callback
	update_track.success = function (cb) {
	    if (!arguments.length) {
		return success;
	    }
	    success.push (cb);
	    return update_track;
	};

	return update_track;
    };
    
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
