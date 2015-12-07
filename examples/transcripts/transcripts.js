var transcript_theme = function () {
    "use strict";

    var theme = function (gB, div) {
        var mydata = tnt.board.track.data.genome.transcript();
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
                .on("click", function (d) {
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
