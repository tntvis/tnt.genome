// var ensembl_rest = require("tnt.ensembl")();
var apijs = require("tnt.api");
var tnt_board = require("tnt.board");
tnt_board.track.data.genome = require("./data.js");
tnt_board.track.feature.genome = require("./feature");
tnt_board.track.layout.genome = require("./layout");
tnt_board.track.data.genome.ensembl = require("tnt.rest")()
    .domain("rest.ensembl.org");

// promises
var Promise = require('es6-promise').Promise;
var minPromise = new Promise(function (res) {
    res(0);
});

tnt_board_genome = function() {
    "use strict";

    var ensembl_rest = tnt_board.track.data.genome.ensembl;

    // Private vars
    var ens_re = /^ENS\w+\d+$/;
    var chr_length;



    // Vars exposed in the API
    var conf = {
        max_coord       : undefined, // Promise that returns the max coordinate. If undef uses the length of the chromosome
        min_coord       : minPromise, // Promise that returns the min coordinate. Defaults to 0
        gene           : undefined,
        xref_search    : function () {},
        ensgene_search : function () {},
        context        : 0,
        rest           : ensembl_rest
    };
    // We "inherit" from board
    var genome_browser = tnt_board()
        .zoom_in(200)
        .zoom_out(5000000); // ensembl region limit
        // .min(0);

    var gene;

    // The location and axis track
    var location_track = tnt_board.track()
        .height(20)
        .color("white")
        .data(tnt_board.track.data.empty())
        .display(tnt_board.track.feature.genome.location());

    var axis_track = tnt_board.track()
        .height(0)
        .color("white")
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
                    genome_browser.from(where.from);
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
                where.species = genome_browser.species();
                where.chr     = genome_browser.chr();
                where.from    = genome_browser.from();
                where.to      = genome_browser.to();
            }
        }

        // Min is 0 by default or use the provided promise
        conf.min_coord
            .then (function (min) {
                genome_browser.min(min);
                if (!conf.max_coord) {
                    var url = ensembl_rest.url()
                        .endpoint("info/assembly/:species/:region_name")
                        .parameters({
                            species: where.species,
                            region_name: where.chr
                        });

                    conf.max_coord = ensembl_rest.call (url)
                        .then (function (resp) {
                            return resp.body.length;
                        });
                }
                return conf.max_coord;
            })
            .then (function (max) {
                genome_browser.max(max);
                genome_browser._start();

            });
    };

    var homologues = function (ensGene, callback)  {
        var url = ensembl_rest.url.homologues ({id : ensGene});
        ensembl_rest.call(url)
            .then (function(resp) {
                var homologues = resp.body.data[0].homologies;
                if (callback !== undefined) {
                    var homologues_obj = split_homologues(homologues);
                    callback(homologues_obj);
                }
        });
    };

    var isEnsemblGene = function(term) {
        if (term.match(ens_re)) {
            return true;
        } else {
            return false;
        }
    };

    var get_gene = function (where) {
        if (isEnsemblGene(where.gene)) {
            get_ensGene(where.gene);
        } else {
            var url = ensembl_rest.url()
                .endpoint("xrefs/symbol/:species/:symbol")
                .parameters({
                    species: where.species,
                    symbol: where.gene
                });
            ensembl_rest.call(url)
                .then (function(resp) {
                    var data = resp.body;
                    data = data.filter(function(d) {
                        return !d.id.indexOf("ENS");
                    });
                    if (data[0] !== undefined) {
                        get_ensGene(data[0].id);
                    }
                    conf.xref_search(resp, where.gene, where.species);
                });
        }
    };

    var get_ensGene = function (id) {
        var url = ensembl_rest.url()
            .endpoint("/lookup/id/:id")
            .parameters({
                id: id
            });

        ensembl_rest.call(url)
            .then (function(resp) {
                var data = resp.body;
                conf.ensgene_search(data);
                var extra = ~~((data.end - data.start) * (conf.context/100));
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

        var orthologues = homologues.filter(function(d){return d.type.match(orthoPatt);});
        var paralogues  = homologues.filter(function(d){return d.type.match(paraPatt);});

        return {
            'orthologues' : orthologues,
            'paralogues'  : paralogues
        };
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
