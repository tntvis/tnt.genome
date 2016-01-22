var transcript_track = tnt.board.track()
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
    .data(tnt.board.track.data.genome.transcript());

var genome = tnt.board.genome()
    .species("human")
    .gene("PTEN")
    .width(950)
    .zoom_in(100)
    .add_track(transcript_track);

genome(yourDiv);

genome.start();
