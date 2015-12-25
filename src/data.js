var board = require("tnt.board");
var apijs = require("tnt.api");

var data_gene = function () {
    var eRest = board.track.data.genome.ensembl;

    var data = board.track.data.async()
        .retriever (function (obj) {
            var track = this;
            // var eRest = data.ensembl();
            var scale = track.display().scale();
            var url = eRest.url.region(obj);
            return eRest.call(url)
            .then (function (resp) {
                    var genes = resp.body;
                    // Set the display_label field
                    for (var i=0; i<genes.length; i++) {
                        var gene = genes[i];
                        if (gene.strand === -1) {
                            gene.display_label = "<" + gene.external_name;
                        } else {
                            gene.display_label = gene.external_name + ">";
                        }
                    }
                    return genes;
                }
            );
        });

    apijs(data)
        .getset('ensembl');

    return data;
};

var data_transcript = function () {
    var eRest = board.track.data.genome.ensembl;

    var data = board.track.data.async()
        .retriever (function (obj) {
            obj.features = ["gene", "transcript", "exon", "cds"];
            var url = eRest.url.region(obj);
            return eRest.call(url)
              .then (function (resp) {
                  var elems = resp.body;
                  var genes = eRest.region2genes(elems);
                  var transcripts = [];
                  for (var i=0; i<genes.length; i++) {
                      var g = genes[i];
                      var ts = data.gene2Transcripts(g);
                      transcripts = transcripts.concat(ts);
                  }
                  return transcripts;
              });
        });

    apijs(data)
        .method("gene2Transcripts", function (g) {
            var ts = g.Transcript;
            var transcripts = [];
            for (var j=0; j<ts.length; j++) {
                var t = ts[j];
                t.exons = transformExons(t);
                t.introns = exonsToExonsAndIntrons(t);
                //var obj = exonsToExonsAndIntrons (transformExons(t), t);
                // t.name = [{
                //     pos: t.start,
                //     name : t.display_name,
                //     strand : t.strand,
                //     transcript : t
                // }];
                t.display_label = t.strand === 1 ? (t.display_name + ">") : ("<" + t.display_name);
                t.key = (t.id + "_" + t.exons.length);
                //obj.id = t.id;
                t.gene = g;
                // obj.transcript = t;
                // obj.external_name = t.display_name;
                //obj.display_label = t.display_label;
                //obj.start = t.start;
                //obj.end = t.end;
                transcripts.push(t);
            }
            return transcripts;
        });

    function exonsToExonsAndIntrons (t) {
        var exons = t.exons;
        //var obj = {};
        //obj.exons = exons;
        var introns = [];
        for (var i=0; i<exons.length-1; i++) {
            var intron = {
                start : exons[i].transcript.strand === 1 ? exons[i].end : exons[i].start,
                end   : exons[i].transcript.strand === 1 ? exons[i+1].start : exons[i+1].end,
                transcript : t
            };
            introns.push(intron);
        }
        return introns;
    }


    function transformExons (transcript) {
        var translationStart;
        var translationEnd;
        if (transcript.Translation !== undefined) {
            translationStart = transcript.Translation.start;
            translationEnd = transcript.Translation.end;
        }
        var exons = transcript.Exon;

        var newExons = [];
        if (exons) {
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
                                //offset  : exons[i].start - transcript.start
                                offset: translationStart - transcript.start
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
                                //offset  : exons[i].start - transcript.start
                                offset : translationEnd - transcript.start
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
        }
        return newExons;
    }

    return data;
};

var data_sequence = function () {
    var eRest = board.track.data.genome.ensembl;

    var data = board.track.data.async()
        .retriever (function (obj) {
            if ((obj.to - obj.from) < data.limit()) {
                var url = eRest.url.sequence(obj);
                return eRest.call(url)
                    .then (function (resp) {
                        var seq = resp.body;
                        var fields = seq.id.split(":");
                        var from = fields[3];
                        var nts = [];
                        for (var i=0; i<seq.seq.length; i++) {
                            nts.push({
                                pos: +from + i,
                                sequence: seq.seq[i]
                            });
                        }
                        return nts;
                    });
            } else { // Region too wide for sequence
                return new Promise (function (resolve, reject) {
                    resolve([]);
                });
            }
        });

    apijs(data)
        .getset("limit", 150);

    return data;
};

// export
var genome_data = {
    gene : data_gene,
    sequence : data_sequence,
    transcript : data_transcript
};

module.exports = exports = genome_data;
