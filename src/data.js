var board = require("tnt.board");
var apijs = require("tnt.api");
var ensemblRestAPI = require("tnt.ensembl");

board.track.data.retriever.ensembl = function () {
    var success = [function () {}];
    var ignore = function () { return false; };
    //var extra = []; // extra fields to be passed to the rest api
    var eRest = ensemblRestAPI();
    var update_track = function (obj) {
        var data_parent = this;
        // Object has loc and a plug-in defined callback
        var loc = obj.loc;
        if (Object.keys(update_track.extra()).length) {
            var extra = update_track.extra();
            for (var item in extra) {
                if (extra.hasOwnProperty(item)) {
                    loc[item] = extra[item];
                }
            }
        }
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
    .getset ('endpoint')
    .getset ('extra', {})

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
    var updater = board.track.data.retriever.ensembl()
    .endpoint ("region")
    // TODO: If success is defined here, means that it can't be user-defined
    // is that good? enough? API?
    // UPDATE: Now success is backed up by an array. Still don't know if this is the best option
    .success (function (genes) {
        for (var i = 0; i < genes.length; i++) {
            if (genes[i].strand === -1) {
                genes[i].display_label = "<" + genes[i].external_name;
            } else {
                genes[i].display_label = genes[i].external_name + ">";
            }
        }
    });
    return board.track.data().update(updater);
};

var data_transcript = function () {
    var updater = board.track.data.retriever.ensembl()
    .endpoint ("region")
    .extra({
        "features" : ["gene", "transcript", "exon", "cds"]
    })
    .success (function (elems) {
        var transcripts = {};
        var genes = {};
        for (var i=0; i<elems.length; i++) {
            var elem = elems[i];
            switch (elem.feature_type) {
                case "gene" :
                genes[elem.id] = elem;
                break;
                case "transcript" :
                var newTranscript = {
                    "id" : elem.id,
                    "label" : elem.external_name,
                    "name" : elem.strand === -1 ? ("<" + elem.external_name) : (elem.external_name + ">"),
                    "start" : elem.start,
                    "end" : elem.end,
                    "strand" : elem.strand,
                    "gene" : genes[elem.Parent],
                    "transcript" : elem,
                    "rawExons" : []
                };
                transcripts[elem.id] = newTranscript;
                break;

                case "exon" :
                var newExon = {
                    "transcript" : elem.Parent,
                    "start" : elem.start,
                    "end" : elem.end
                };
                transcripts[elem.Parent].rawExons.push(newExon)
                break;

                case "cds" :
                if (transcripts[elem.Parent].Translation === undefined) {
                    transcripts[elem.Parent].Translation = {};
                }
                var cdsStart = transcripts[elem.Parent].Translation.start;
                if ((cdsStart === undefined) || (cdsStart > elem.start)) {
                    transcripts[elem.Parent].Translation.start = elem.start;
                }

                var cdsEnd = transcripts[elem.Parent].Translation.end;
                if ((cdsEnd === undefined) || (cdsEnd < elem.end)) {
                    transcripts[elem.Parent].Translation.end = elem.end;
                }
                break;
            }
        }
        var ts = [];
        for (var id in transcripts) {
            if (transcripts.hasOwnProperty(id)) {
                var t = transcripts[id];
                var obj = exonsToExonsAndIntrons (transformExons(t), t);
                obj.name = [{
                    pos: t.start,
                    name : t.name,
                    strand : t.strand,
                    transcript : t
                }];
                obj.id = t.id;
                obj.gene = t.gene;
                obj.transcript = t.transcript;
                obj.external_name = t.label;
                obj.display_label = t.name;
                obj.start = t.start;
                obj.end = t.end;
                ts.push(obj)
            }
        }
        return ts;

    });

    function exonsToExonsAndIntrons (exons, t) {
        var obj = {};
        obj.exons = exons;
        obj.introns = [];
        for (var i=0; i<exons.length-1; i++) {
            var intron = {
                start : exons[i].transcript.strand === 1 ? exons[i].end : exons[i].start,
                end   : exons[i].transcript.strand === 1 ? exons[i+1].start : exons[i+1].end,
                transcript : t
            };
            obj.introns.push(intron);
        }
        return obj;
    }


    function transformExons (transcript) {
        var translationStart;
        var translationEnd;
        if (transcript.Translation !== undefined) {
            translationStart = transcript.Translation.start;
            translationEnd = transcript.Translation.end;
        }
        var exons = transcript.rawExons;

        var newExons = [];
        for (var i=0; i<exons.length; i++) {
            if (transcript.Translation === undefined) { // NO coding transcript
                newExons.push({
                    start   : exons[i].start,
                    end     : exons[i].end,
                    transcript : transcript,
                    coding  : false,
                    offset  : exons[i].start - transcript.start
                });
            } else {
                if (exons[i].start < translationStart) {
                    // 5'
                    if (exons[i].end < translationStart) {
                        // Completely non coding
                        newExons.push({
                            start  : exons[i].start,
                            end    : exons[i].end,
                            transcript : transcript,
                            coding : false,
                            offset  : exons[i].start - transcript.start
                        });
                    } else {
                        // Has 5'UTR
                        var ncExon5 = {
                            start  : exons[i].start,
                            end    : translationStart,
                            transcript : transcript,
                            coding : false,
                            offset  : exons[i].start - transcript.start
                        };
                        var codingExon5 = {
                            start  : translationStart,
                            end    : exons[i].end,
                            transcript : transcript,
                            coding : true,
                            offset  : exons[i].start - transcript.start
                        };
                        if (exons[i].strand === 1) {
                            newExons.push(ncExon5);
                            newExons.push(codingExon5);
                        } else {
                            newExons.push(codingExon5);
                            newExons.push(ncExon5);
                        }
                    }
                } else if (exons[i].end > translationEnd) {
                    // 3'
                    if (exons[i].start > translationEnd) {
                        // Completely non coding
                        newExons.push({
                            start   : exons[i].start,
                            end     : exons[i].end,
                            transcript : transcript,
                            coding  : false,
                            offset  : exons[i].start - transcript.start
                        });
                    } else {
                        // Has 3'UTR
                        var codingExon3 = {
                            start  : exons[i].start,
                            end    : translationEnd,
                            transcript : transcript,
                            coding : true,
                            offset  : exons[i].start - transcript.start
                        };
                        var ncExon3 = {
                            start  : translationEnd,
                            end    : exons[i].end,
                            transcript : transcript,
                            coding : false,
                            offset  : exons[i].start - transcript.start
                        };
                        if (exons[i].strand === 1) {
                            newExons.push(codingExon3);
                            newExons.push(ncExon3);
                        } else {
                            newExons.push(ncExon3);
                            newExons.push(codingExon3);
                        }
                    }
                } else {
                    // coding exon
                    newExons.push({
                        start  : exons[i].start,
                        end    : exons[i].end,
                        transcript : transcript,
                        coding : true,
                        offset  : exons[i].start - transcript.start
                    });
                }
            }
        }
        return newExons;
    }

    return board.track.data().update(updater);
};

// export
var genome_data = {
    gene : data_gene,
    sequence : data_sequence,
    transcript : data_transcript
};

module.exports = exports = genome_data;
