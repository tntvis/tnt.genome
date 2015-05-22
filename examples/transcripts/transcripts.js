var transcript_theme = function () {
    "use strict";

    var theme = function (gB, div) {
        var mydata = tnt.board.track.data.genome.transcript();
        mydata.update().success(function (transcripts) {
            var newGenes = {};
            for (var i=0; i<transcripts.length; i++) {
                var t = transcripts[i];
                var parts = t.external_name.split('-');
                parts.pop();
                var mygene = parts.join('-');
                if (gB.gene() === mygene) {
                    newGenes[t.external_name] = t;
                    continue;
                } else if (newGenes[mygene] === undefined) {
                    t.exons = [{
                        start : t.start,
                        end : t.end,
                        offset : 0,
                        isGene : true
                    }];
                    t.introns = [];
                    t.display_label = mygene;
                    t.isGene = true;
                    newGenes[mygene] = t;
                } else {
                    var newStart = d3.min([newGenes[mygene].start, t.start]);
                    newGenes[mygene].start = newStart;
                    newGenes[mygene].exons[0].start = newStart;
                    var newEnd = d3.max([newGenes[mygene].end, t.end]);
                    newGenes[mygene].end = newEnd;
                    newGenes[mygene].exons[0].end = newEnd;
                }
            }
            var elems = [];
            for (var elem in newGenes) {
                if (newGenes.hasOwnProperty(elem)) {
                    elems.push(newGenes[elem]);
                }
            }
            return elems;
        })

        var transcript_track = tnt.board.track()
            .height(200)
            .background_color("#EEEFFF")
            .display(tnt.board.track.feature.genome.transcript()
                .foreground_color (function (t) {
                    if (t.isGene) {
                        return "#005588";
                    }
                    return "red";
                })
                .on_click(function (d) {
                    console.log(d);
                })
             )
            .data(mydata);

        var gene_track = tnt.board.track()
            .height(200)
            .background_color("white")
            .display(tnt.board.track.feature.genome.gene()
                .foreground_color("#550055")
		    )
            .data(tnt.board.track.data.genome.gene());

        var sequence_track = tnt.board.track()
            .height(30)
            .background_color("white")
            .display(tnt.board.track.feature.genome.sequence())
            .data(tnt.board.track.data.genome.sequence()
                .limit(150)
            );

        gB(div);
        gB
            .zoom_in(100)
	        .add_track(sequence_track)
	    //  .add_track(gene_track)
            .add_track(transcript_track);

        gB.start();
    };

    return theme;
};
