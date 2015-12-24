var theme = function () {
    "use strict";

    var thisGene;

    var theme = function (gB, div) {
        var mixedData = tnt.board.track.data.genome.gene();
        thisGene = gB.gene();

        var eRest = tnt.board.track.data.genome.rest;
        var gene_updater = mixedData.update().retriever();
        mixedData.update().retriever ( function (loc) {
            return gene_updater(loc)
                .then (function (genes) { // genes
                    for (var i=0; i<genes.length; i++) {
                        genes[i].key = genes[i].id;
                        genes[i].isGene = true;
                        genes[i].exons = [{
                            start: genes[i].start,
                            end: genes[i].end,
                            coding: true,
                            offset: 0,
                            isGene: true
                        }];
                    }
                    var url = eRest.url.xref({
                        species: "human",
                        name: thisGene
                    });
                    return eRest.call(url)
                        .then (function (resp) {
                            var ensId = resp.body[0].id;
                            return ensId;
                        })
                        .then (function (ensId) {
                            var url = eRest.url.gene({
                                id: ensId,
                                expand: true
                            });
                            return eRest.call(url);
                        })
                        .then (function (resp) { // transcripts + exons
                            var g = resp.body;
                            var tss = tnt.board.track.data.genome.transcript().gene2Transcripts(g);

                            genes = genes.concat(tss);
                            return genes;
                        });
                });
        });

        var mixed_track = tnt.board.track()
            .height(200)
            .color("#EEEFFF")
            .display(tnt.board.track.feature.genome.transcript()
                .color (function (t) {
                    if (t.isGene) {
                        return "#005588";
                    }
                    return "red";
                })
                .on("click", function (d) {
                    console.log(d);
                })
             )
            .data(mixedData);


        gB(div);
        gB
            .zoom_in(100)
            .add_track(mixed_track);

        gB.start();
    };

    return theme;
};
