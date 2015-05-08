var board = require("tnt.board");
var apijs = require("tnt.api");
var ensemblRestAPI = require("tnt.ensembl");

board.track.data.retriever.ensembl = function () {
    var success = [function () {}];
    var ignore = function () { return false };
    var endpoint;
    var eRest = ensemblRestAPI();
    var update_track = function (obj) {
	var data_parent = this;
	// Object has loc and a plug-in defined callback
	var loc = obj.loc;
	var plugin_cbak = obj.on_success;
	var url = eRest.url[update_track.endpoint()](loc);
	if (ignore (loc)) {
	    data_parent.elements([]);
	    plugin_cbak();
	} else {
	    eRest.call(url)
		.then (function (resp) {
		    // User defined
		    for (var i=0; i<success.length; i++) {
			var mod = success[i](resp.body);
			if (mod) {
			    resp.body = mod;
			}
		    }

		    data_parent.elements(resp.body);

		    // plug-in defined
		    plugin_cbak();
		});
	} 
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

    update_track.ignore = function (cb) {
	if (!arguments.length) {
	    return ignore;
	}
	ignore = cb;
	return update_track;
    };

    return update_track;
};


// A predefined track for sequences
var data_sequence = function () {
    var limit = 150;
    var track_data = board.track.data();

    var updater = board.track.data.retriever.ensembl()
	.ignore (function (loc) {
	    return (loc.to - loc.from) > limit;
	})
	.endpoint("sequence")
	.success (function (resp) {
	    // Get the coordinates
	    var fields = resp.id.split(":");
	    var from = fields[3];
	    var nts = [];
	    for (var i=0; i<resp.seq.length; i++) {
		nts.push({
		    pos: +from + i,
		    sequence: resp.seq[i]
		});
	    }
	    return nts;
	});

    track_data.limit = function (newlim) {
	if (!arguments.length) {
	    return limit;
	}
	limit = newlim;
	return this;
    };

    return track_data.update(updater); 
};

// A predefined track for genes
var data_gene = function () {
//board.track.data.gene = function () {
    
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
    return board.track.data().update(updater);
}

var genome_data = {
    gene : data_gene,
    sequence : data_sequence
};

module.exports = exports = genome_data;
