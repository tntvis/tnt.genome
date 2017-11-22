var transcript_theme = function () {
    "use strict";

    var theme = function (gB, div) {

        // Sequence track
        var sequence_track = tnt.board.track()
            .height(30)
            .color("white")
            .display(tnt.board.track.feature.genome.sequence())
            .data(tnt.board.track.data.genome.sequence()
                .limit(150)
            );

        // Pins track
        var pin_track = tnt.board.track()
            .height(60)
            .color('#FFFFFF')
            .display(tnt.board.track.feature.pin()
                .color('red')
            )
            .data(tnt.board.track.data.sync()
                .retriever(function () {
                    return [
                        {
                            pos: 87880000,
                            val: 1,
                            genes: ['ENSG00000171862', 'ENSG00000227905']
                        },
                        {
                            pos: 87980000,
                            val: 1,
                            genes: ['ENSG00000198682']
                        }
                    ]
                })
            );


        var connector_feature = tnt.board.track.feature()
            .distribute(function (transcripts) {
                var track = this;
                var display = track.display();
                var xScale  = display.scale();
                var slot_height = display.layout().gene_slot().slot_height;
                var y = track.height();

                var currSlots = {};
                transcripts.data().forEach(function (t) {
                    currSlots[t.id] = t.slot;
                });

                transcripts.selectAll('path')
                    .transition()
                    .duration(200)
                    .attr('d', function (d) {
                        // var tPos = (d.slot) * slot_height;
                        var tPos = currSlots[d.id] * slot_height;
                        var from = xScale(d.from);
                        var to1 = xScale(d.to1);
                        var to2 = xScale(d.to2);
                        var path1 = 'M' + from + ',' + y + ' C' + from + ',' + (tPos + ((y - tPos) / 2)) + ' ' + to1 + ',' + (tPos + ((y - tPos) / 2)) + ' ' + to1 + ',' + tPos;
                        var path2 = 'L' + to2 + ',' + tPos;
                        var path3 = 'C' + to2 + ',' + (tPos + ((y - tPos) / 2)) + ' ' + from + ',' + (tPos + ((y - tPos) / 2)) + ' ' + from + ',' + y;
                        var path4 = 'Z';
                        return [path1, path2, path3, path4].join(' ');
                    })
            })
            .create(function (sel) {
                var track = this;
                // Same as: var xScale = transcript_feature.scale();
                var display = track.display();
                var xScale = display.scale();
                var slot_height = display.layout().gene_slot().slot_height;
                var y = track.height();

                // Sub-selection only with connectors
                var connectorsSel = sel
                    .filter(function (t) {
                        return t.connectors && t.connectors.length;
                    });

                connectorsSel
                    .data()
                    .forEach(function (d) {
                        d.connectors.forEach(function (c) {
                           c.slot = d.slot;
                        });
                    });

                connectorsSel.selectAll('.connector')
                    .data(function (d) {
                        return d.connectors;
                    })
                    .enter()
                    .append('path')
                    .attr('class', 'connector')
                    .style('fill', '#cccccc')
                    .style('stroke', 'none')
                    .style('opacity', 0.5)
                    .attr('d', function (d) {
                        var tPos = (d.slot) * slot_height;
                        var from = xScale(d.from);
                        var to1 = xScale(d.to1);
                        var to2 = xScale(d.to2);
                        var path1 = 'M' + from + ',' + y + ' C' + from + ',' + (tPos + ((y - tPos) / 2)) + ' ' + to1 + ',' + (tPos + ((y - tPos) / 2)) + ' ' + to1 + ',' + tPos;
                        var path2 = 'L' + to2 + ',' + tPos;
                        var path3 = 'C' + to2 + ',' + (tPos + ((y - tPos) / 2)) + ' ' + from + ',' + (tPos + ((y - tPos) / 2)) + ' ' + from + ',' + y;
                        var path4 = 'Z';
                        return [path1, path2, path3, path4].join(' ');
                    });
            })
            .move(function (sel) {
                var track = this;
                var display = track.display();
                var xScale = display.scale();
                var slot_height = display.layout().gene_slot().slot_height;
                var y = track.height();

                var currSlots = {};
                sel.data().forEach(function (t) {
                    currSlots[t.id] = t.slot;
                });

                sel.selectAll('.connector')
                    .attr('d', function (d) {
                        // var tPos = (d.slot) * slot_height;
                        var tPos = (currSlots[d.id]) * slot_height;
                        var from = xScale(d.from);
                        var to1 = xScale(d.to1);
                        var to2 = xScale(d.to2);
                        var path1 = 'M' + from + ',' + y + ' C' + from + ',' + (tPos + ((y - tPos) / 2)) + ' ' + to1 + ',' + (tPos + ((y - tPos) / 2)) + ' ' + to1 + ',' + tPos;
                        var path2 = 'L' + to2 + ',' + tPos;
                        var path3 = 'C' + to2 + ',' + (tPos + ((y - tPos) / 2)) + ' ' + from + ',' + (tPos + ((y - tPos) / 2)) + ' ' + from + ',' + y;
                        var path4 = 'Z';
                        return [path1, path2, path3, path4].join(' ');
                    });
            });

        var transcript_feature = tnt.board.track.feature.genome.transcript()
            .color (function () {
                return "#577399";
            })
            .on("click", function (d) {
                console.log(d);
            });

        var transcript_feature_create = transcript_feature.create();
        var connector_feature_create = connector_feature.create();
        transcript_feature.create(function (els) {
            connector_feature_create.call(this, els);
            transcript_feature_create.call(this, els);
        });

        var transcript_feature_move = transcript_feature.move();
        var connector_feature_move = connector_feature.move();
        transcript_feature.move(function (els) {
            connector_feature_move.call(this, els);
            transcript_feature_move.call(this, els);
        });

        var transcript_feature_distribute = transcript_feature.distribute();
        var connector_feature_distribute = connector_feature.distribute();
        transcript_feature.distribute(function (data) {
            connector_feature_distribute.call(this, data);
            transcript_feature_distribute.call(this, data);
        });

        var transcript_track = tnt.board.track()
            .height(200)
            .color("#FFFFFF")
            .data(tnt.board.track.data.genome.canonical())
            .display(transcript_feature);

        var transcript_data = tnt.board.track.data.genome.canonical();
        var transcript_data_retriever = transcript_data.retriever();
        transcript_data.retriever(function (loc) {
            return transcript_data_retriever.call(transcript_track, loc)
                .then(function (transcripts) {
                    calculate_connectors(pin_track.data().retriever()(), transcripts);
                    return transcripts;
                })
        });


        transcript_track.data(transcript_data);

        gB(div);
        gB
            .zoom_in(100)
	        .add_track(sequence_track)
            .add_track(transcript_track)
            .add_track(pin_track);

        gB.start();
    };

    return theme;
};

function calculate_connectors(pins, transcripts) {
    for (var i = 0; i < pins.length; i++) {
        var pin = pins[i];
        if (!pin.genes) {
            continue;
        }
        for (var j = 0; j < transcripts.length; j++) {
            var transcript = transcripts[j];
            for (var k = 0; k < pin.genes.length; k++) {
                var gene = pin.genes[k];
                if (gene === transcript.gene.id) {
                    if (!transcript.connectors) {
                        transcript.connectors = [];
                    }
                    transcript.connectors.push({
                        from: pin.pos,
                        to1: transcript.start,
                        to2: transcript.end,
                        id: transcript.id
                    })
                }
            }
        }
    }
}