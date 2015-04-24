var tnt_rest = require("tnt.ensembl");
var apijs = require("tnt.api");
var tnt_board = require("tnt.board");
tnt_board.track.layout.gene = require("./layout.js");
tnt_board.track.feature.gene = require("./feature.js");

tnt_board_genome = function() {
    "use strict"

    // Private vars
    var ens_re = /^ENS\w+\d+$/;
    var eRest = tnt_rest();
    var chr_length;
    
    // Vars exposed in the API
    var conf = {
	gene           : undefined,
	xref_search    : function () {},
	ensgene_search : function () {},
	context        : 0
    };

    var gene;
    var limits = {
        left : 0,
	right : undefined,
	zoom_out : eRest.limits.region,
	zoom_in  : 200
    };


    // We "inherit" from board
    var genome_browser = tnt_board();

    // The location and axis track
    var location_track = tnt_board.track()
	.height(20)
	.background_color("white")
	.data(tnt_board.track.data.empty())
	.display(tnt_board.track.feature.location());

    var axis_track = tnt_board.track()
	.height(20)
	.background_color("white")
	.data(tnt_board.track.data.empty())
	.display(tnt_board.track.feature.axis());

    genome_browser
	.add_track(location_track)
	.add_track(axis_track);

    // Default location:
    genome_browser
	.species("human")
	.chr(7)
	.from(139424940)
	.to(141784100);

    // We save the start method of the 'parent' object
    genome_browser._start = genome_browser.start;

    // We hijack parent's start method
    var start = function (where) {
	if (where !== undefined) {
	    if (where.gene !== undefined) {
		get_gene(where);
		return;
	    } else {
		if (where.species === undefined) {
		    where.species = genome_browser.species();
		} else {
		    genome_browser.species(where.species);
		}
		if (where.chr === undefined) {
		    where.chr = genome_browser.chr();
		} else {
		    genome_browser.chr(where.chr);
		}
		if (where.from === undefined) {
		    where.from = genome_browser.from();
		} else {
		    genome_browser.from(where.from)
		}
		if (where.to === undefined) {
		    where.to = genome_browser.to();
		} else {
		    genome_browser.to(where.to);
		}
	    }
	} else { // "where" is undef so look for gene or loc
	    if (genome_browser.gene() !== undefined) {
		get_gene({ species : genome_browser.species(),
			   gene    : genome_browser.gene()
			 });
		return;
	    } else {
		where = {};
		where.species = genome_browser.species(),
		where.chr     = genome_browser.chr(),
		where.from    = genome_browser.from(),
		where.to      = genome_browser.to()
	    }
	}

	genome_browser.right (function (done) {
	    // Get the chromosome length and use it as the 'right' limit

	    genome_browser.zoom_in (limits.zoom_in);
	    genome_browser.zoom_out (limits.zoom_out);

	    var url = eRest.url.chr_info ({
		species : where.species,
		chr     : where.chr
	    });

	    eRest.call (url)
		.then( function (resp) {
		    done(resp.body.length);
		});
	});
	genome_browser._start();
    };

    var homologues = function (ensGene, callback)  {
	var url = eRest.url.homologues ({id : ensGene})
	eRest.call(url)
	    .then (function(resp) {
		var homologues = resp.body.data[0].homologies;
		if (callback !== undefined) {
		    var homologues_obj = split_homologues(homologues)
		    callback(homologues_obj);
		}
	    });
    }

    var isEnsemblGene = function(term) {
	if (term.match(ens_re)) {
            return true;
        } else {
            return false;
        }
    };

    var get_gene = function (where) {
	if (isEnsemblGene(where.gene)) {
	    get_ensGene(where.gene)
	} else {
	    var url = eRest.url.xref ({
		species : where.species,
		name    : where.gene 
	    });
	    eRest.call(url)
		.then (function(resp) {
		    var data = resp.body;
		    data = data.filter(function(d) {
			return !d.id.indexOf("ENS");
		    });
		    if (data[0] !== undefined) {
			conf.xref_search(resp);
			get_ensGene(data[0].id)
		    } else {
			genome_browser.start();
		    }
		});
	}
    };

    var get_ensGene = function (id) {
	var url = eRest.url.gene ({id : id})
	eRest.call(url)
	    .then (function(resp) {
		var data = resp.body;
		conf.ensgene_search(data);
		var extra = ~~((data.end - data.start) * (conf.context/100));
		console.log(data);
		genome_browser
		    .species(data.species)
		    .chr(data.seq_region_name)
		    .from(data.start - extra)
		    .to(data.end + extra);

		genome_browser.start( { species : data.species,
					chr     : data.seq_region_name,
					from    : data.start - extra,
					to      : data.end + extra
				      } );
	    });
    };

    var split_homologues = function (homologues) {
	var orthoPatt = /ortholog/;
	var paraPatt = /paralog/;

	var orthologues = homologues.filter(function(d){return d.type.match(orthoPatt)});
	var paralogues  = homologues.filter(function(d){return d.type.match(paraPatt)});

	return {'orthologues' : orthologues,
		'paralogues'  : paralogues};
    };

    var api = apijs(genome_browser)
	.getset (conf);

    api.method ({
	start      : start,
	homologues : homologues
    });

    return genome_browser;
};

module.exports = exports = tnt_board_genome;
