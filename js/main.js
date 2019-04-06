'use strict';

function Graph(id, data, zero_based = false) {

    const BOUNDS_WIDTH = 10,
        DRAG_LEFT = 0,
        DRAG_MIDDLE = 1,
        DRAG_RIGHT = 2;

    var props = {
        id: id,
        uid: Math.random().toString(16).slice(2),
        sourceData: data,
        normalizedData: [],
        container: null,
        graph: null,
        navigation: null,
        viewport: null,
        preViewport: null,
        postViewport: null,
        legend: null,
        hiddenLines: [],
        navigationStart: 0.699,
        navigationWidth: 0.3,
        viewTop: 1,
        currentTopY: 0,
        viewBottom: 0,
        labels: [],
        zeroBased: zero_based
    }

    var methods = {
        init: function() {
            props.container = document.getElementById(props.id);
            props.graph = props.container.appendChild(document.createElement('div'));
            if (Object.keys(props.sourceData.names).length > 1)
                props.graph.style.height = "80%";
            else
                props.graph.style.height = "90%";
            props.navigation = props.container.appendChild(document.createElement('div'));
            props.navigation.style.height = "10%";

            props.preViewport = props.navigation.appendChild(document.createElement('div'));
            props.preViewport.style.backgroundColor = "#eee";
            props.preViewport.style.opacity = "0.7";
            props.preViewport.style.position = "absolute";

            props.viewport = props.navigation.appendChild(document.createElement('div'));
            props.viewport.style.border = "2px solid #ddd";
            props.viewport.style.position = "absolute";
            props.viewport.style.zIndex = 1000; // над другими элементами
            props.viewport.setAttributeNS(null, "class", "viewport");


            props.postViewport = props.navigation.appendChild(document.createElement('div'));
            props.postViewport.style.backgroundColor = "#eee";
            props.postViewport.style.opacity = "0.7";
            props.postViewport.style.position = "absolute";


            if (Object.keys(props.sourceData.names).length > 1) {
                props.legend = props.container.appendChild(document.createElement('div'));
                props.legend.style.height = "10%";
                var ic = 0;
                for (var name in props.sourceData.names) {
                    if (props.sourceData.names.hasOwnProperty(name)) {
                        let btn = props.legend.appendChild(document.createElement('div')),
                            tbtn = document.createTextNode(props.sourceData.names[name]),
                            icn = btn.appendChild(document.createElement('div')),
                            ticn = document.createTextNode('\u2713');
                        btn.setAttributeNS(null, "class", "toggle-btn");
                        btn.setAttributeNS(null, "data-color", props.sourceData.colors[name]);
                        btn.setAttributeNS(null, "data-line", "gline_" + props.uid + "_" + ic);
                        btn.style.color = props.sourceData.colors[name];
                        icn.setAttributeNS(null, "class", "toggle-btn-icon");
                        icn.style.textAlign = "center";
                        icn.style.borderColor = props.sourceData.colors[name];
                        icn.style.backgroundColor = props.sourceData.colors[name];
                        icn.appendChild(ticn);
                        btn.appendChild(icn);
                        btn.appendChild(tbtn);

                        function toggleLine(e) {
                            let currentLine = document.getElementById(e.srcElement.getAttribute('data-line'));
                            if (typeof currentLine != 'undefined') {

                                let hiddenIndex = parseInt(e.srcElement.getAttribute('data-line').split('_')[2])

                                if (props.hiddenLines.includes(hiddenIndex)) {
                                    e.srcElement.getElementsByTagName("div")[0].style.backgroundColor = e.srcElement.style.color;
                                    var index = props.hiddenLines.indexOf(hiddenIndex);
                                    if (index > -1) {
                                        props.hiddenLines.splice(index, 1);
                                    }
                                    methods.setViewtop()
                                    methods.redraw(true)
                                    methods.animate({
                                        duration: 500,
                                        timing: function(timeFraction) {
                                            return timeFraction;
                                        },
                                        draw: function(progress) {
                                            currentLine.style.opacity = progress;
                                        }
                                    });
                                } else {
                                    if ((props.hiddenLines.length + 1) == props.normalizedData.y.length)
                                        return;
                                    e.srcElement.getElementsByTagName("div")[0].style.backgroundColor = 'white';
                                    props.hiddenLines.push(hiddenIndex);
                                    methods.setViewtop()
                                    methods.redraw(true)
                                    methods.animate({
                                        duration: 500,
                                        timing: function(timeFraction) {
                                            return timeFraction;
                                        },
                                        draw: function(progress) {
                                            currentLine.style.opacity = 1 - progress;
                                        }
                                    });
                                }
                            }
                        }

                        btn.onclick = function(e) {
                            toggleLine(e);
                        }
                    }
                    ic++;
                }
            }
        },
        normalize: function() {
            let x = [],
                y = [],
                maxY = 0,
                minY = Infinity,
                deltaX = 0,
                shiftX = 0,
                deltaY = 0,
                shiftY = 0;

            for (var column = 0; column < props.sourceData.columns.length; column++) {
                if (props.sourceData.columns[column][0] == 'x')
                    x = props.sourceData.columns[column].slice(1);
                else {
                    let grNum = parseInt(props.sourceData.columns[column][0][1])
                    y[grNum] = props.sourceData.columns[column].slice(1);

                    if (maxY < Math.max.apply(null, y[grNum])) maxY = Math.max.apply(null, y[grNum]);
                    if (minY > Math.min.apply(null, y[grNum])) minY = Math.min.apply(null, y[grNum]);
                }
            };

            deltaX = 100 / Math.abs(Math.max.apply(null, x) - Math.min.apply(null, x));
            shiftX = 1 * Math.min.apply(null, x);

            deltaY = 100 / Math.abs(maxY - minY);
            shiftY = 1 * minY - 2;

            props.normalizedData = {
                x: x,
                y: y,
                deltaX: deltaX,
                shiftX: shiftX,
                deltaY: deltaY,
                shiftY: shiftY,
                maxY: maxY,
                minY: minY
            }

        },
        setViewtop: function() {
            let v = props.normalizedData,
                res = 0,
                resY = 0,
                resBtn = Infinity;
            for (var i = 0; i <= v.x.length - 1; i++) {
                let nx = (v.x[i] - v.shiftX) * v.deltaX
                if ((nx < props.navigationStart * 100) || (nx > (props.navigationStart + props.navigationWidth) * 100))
                    continue;
                for (var j = 0; j <= v.y.length - 1; j++) {
                    if (props.hiddenLines.includes(j))
                        continue
                    if (((v.y[j][i] - v.shiftY) * v.deltaY) > res) {
                        res = ((v.y[j][i] - v.shiftY) * v.deltaY)
                        resY = v.y[j][i];
                    }

                    //if(((v.y[j][i] - v.shiftY) * v.deltaY) < resBtn ) 
                    //	resBtn = ((v.y[j][i] - v.shiftY) * v.deltaY)
                }
            }
            props.currentTopY = resY;
            props.viewTop = res / 101;
            //props.viewBottom = resBtn/100;
            return res;
        },
        animate: function(options) {

            var start = performance.now();

            requestAnimationFrame(function animate(time) {
                var timeFraction = (time - start) / options.duration;
                if (timeFraction > 1) timeFraction = 1;

                var progress = options.timing(timeFraction)

                if (progress < 0)
                    progress = 0;

                options.draw(progress);

                if (timeFraction < 1) {
                    requestAnimationFrame(animate);
                }

            });
        },
        redraw: function(animate) {
            if (!animate) {
                let verticalDelta = Math.ceil(100 - props.viewTop * 100);
                document.getElementById("mainGraph_" + props.uid).setAttribute("viewBox", parseFloat(props.navigationStart * 100) + " " + verticalDelta + " " + parseFloat(props.navigationWidth * 100) + " " + (102 - verticalDelta));
            } else {
                var vbt = document.getElementById("mainGraph_" + props.uid).getAttribute("viewBox").split(" ");
                methods.animate({
                    duration: 500,
                    timing: function(timeFraction) {
                        return timeFraction;
                    },
                    draw: function(progress) {

                        let verticalDelta = (1 - props.viewTop - props.viewBottom) * 100,
                            vd1 = parseFloat(vbt[1]),
                            vd2 = parseFloat(vbt[3]);

                        vd1 = vd1 - (vd1 - verticalDelta) * progress
                        vd2 = vd2 - (vd2 - 102 + verticalDelta) * progress

                        document.getElementById("mainGraph_" + props.uid).setAttribute("viewBox", parseFloat(props.navigationStart * 100) + " " + vd1 + " " + parseFloat(props.navigationWidth * 100) + " " + vd2);
                    }
                });

            }
            methods.drawGuidelines()
        },
        navdecor: function() {
            props.preViewport.style.height = props.navigation.offsetHeight + "px";
            props.preViewport.style.left = parseFloat(props.navigation.getBoundingClientRect().left) + "px";
            props.preViewport.style.width = parseFloat(props.viewport.style.left) - parseFloat(props.navigation.getBoundingClientRect().left) + "px";

            props.postViewport.style.height = props.navigation.offsetHeight + "px";
            props.postViewport.style.left = parseFloat(props.viewport.style.left) + parseFloat(props.viewport.style.width) + 4 + "px";;
            props.postViewport.style.width = parseFloat(props.navigation.getBoundingClientRect().right) - parseFloat(props.postViewport.style.left) + "px";
        },
        draw: function() {
            function getPolyline(v, n, color, preview) {
                let l = document.createElementNS("http://www.w3.org/2000/svg", "polyline"),
                    coordString = "";

                if (!preview && props.zeroBased)
                    v.shiftY = 0;

                for (var i = 0; i <= v.x.length - 1; i++) {
                    coordString += ((v.x[i] - v.shiftX) * v.deltaX) + " " + (101 - ((v.y[n][i] - v.shiftY) * v.deltaY)) + " "; // 101 due to non-zero stroke
                };

                l.setAttributeNS(null, "points", coordString);
                l.setAttributeNS(null, "id", "gline_" + props.uid + "_" + n);
                l.setAttributeNS(null, "stroke", color);
                l.setAttributeNS(null, "fill", "none");
                l.setAttributeNS(null, "stroke-width", "1.5");
                l.setAttributeNS(null, "vector-effect", "non-scaling-stroke");

                l.setAttributeNS(null, "shape-rendering", "geometricPrecision");
                return l;
            }
            // nav graph
            var svgSmall = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svgSmall.setAttributeNS(null, "preserveAspectRatio", "none");

            svgSmall.setAttributeNS(null, "viewBox", "0 0 100 100");
            props.navigation.appendChild(svgSmall);


            var smallG = [];
            for (var i = 0; i < props.normalizedData.y.length; i++) {
                smallG.push(getPolyline(props.normalizedData, i, props.sourceData.colors["y" + i], true));
                svgSmall.appendChild(smallG[i]);
            };

            // main graph
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttributeNS(null, "preserveAspectRatio", "none");
            svg.setAttributeNS(null, "id", "mainGraph_" + props.uid);

            svg.setAttributeNS(null, "viewBox", parseFloat(props.navigationStart * 100) + " 0 " + parseFloat(props.navigationWidth * 100) + " 100");
            props.graph.appendChild(svg);

            var mainG = [];
            for (var i = 0; i < props.normalizedData.y.length; i++) {
                mainG.push(getPolyline(props.normalizedData, i, props.sourceData.colors["y" + i], false));
                svg.appendChild(mainG[i]);
            };


            svg.setAttributeNS(null, "height", props.graph.offsetHeight);
            svg.setAttributeNS(null, "width", props.graph.offsetWidth);

            svgSmall.setAttributeNS(null, "height", props.navigation.offsetHeight);
            svgSmall.setAttributeNS(null, "width", props.navigation.offsetWidth);

            props.viewport.style.height = (props.navigation.offsetHeight - 4) + "px";
            props.viewport.style.width = (props.navigation.offsetWidth * props.navigationWidth) + "px";
            props.viewport.style.left = (props.navigation.getBoundingClientRect().x + props.navigation.offsetWidth * props.navigationStart) + "px";
            props.viewport.style.cursor = "pointer";

            methods.navdecor();

            // start drag
            function touchToMouse(e) {
                let res = e.touches[0],
                    rect = e.target.getBoundingClientRect();
                res['offsetX'] = e.targetTouches[0].pageX - rect.left;
                return res;
            }

            props.viewport.ontouchstart = function(e) {
                startDrag(touchToMouse(e))
            }

            props.viewport.onmousedown = function(e) {
                startDrag(e)
            }

            function startDrag(e) {

                var coords = getCoords(props.viewport);
                var shiftX = e.pageX - coords.left;
                var shiftY = e.pageY - coords.top;
                var rshiftX = e.pageX - (coords.left + parseFloat(props.viewport.style.width));

                var drag = DRAG_MIDDLE;

                if (e.offsetX < BOUNDS_WIDTH)
                    drag = DRAG_LEFT;
                else if (e.offsetX > (props.viewport.getBoundingClientRect().width - BOUNDS_WIDTH))
                    drag = DRAG_RIGHT;

                moveAt(e);

                function moveAt(e) {

                    let oldLeft = props.viewport.style.left,
                        oldWidth = props.viewport.style.width;


                    if (drag == DRAG_MIDDLE) {
                        if ((parseFloat(e.pageX - shiftX) > props.navigation.getBoundingClientRect().x) && (parseFloat(e.pageX - shiftX) + props.viewport.getBoundingClientRect().width < props.navigation.getBoundingClientRect().right)) {
                            props.viewport.style.left = e.pageX - shiftX + 'px';
                            props.navigationStart = (props.viewport.getBoundingClientRect().x - props.navigation.getBoundingClientRect().x) / props.navigation.getBoundingClientRect().width;
                        } else if (parseFloat(e.pageX - shiftX) <= props.navigation.getBoundingClientRect().x) {
                            props.viewport.style.left = props.navigation.getBoundingClientRect().x + "px";
                            props.navigationStart = 0;
                        } else {
                            props.viewport.style.left = (props.navigation.getBoundingClientRect().right - props.viewport.getBoundingClientRect().width) + "px";
                            props.navigationStart = 1 - props.navigationWidth;
                        }

                    } else if (drag == DRAG_LEFT) {
                        if ((parseFloat(e.pageX - shiftX) > props.navigation.getBoundingClientRect().x) && (parseFloat(e.pageX - shiftX) < (props.viewport.getBoundingClientRect().right - BOUNDS_WIDTH * 2))) {
                            props.viewport.style.left = e.pageX - shiftX + 'px';
                            props.navigationStart = (props.viewport.getBoundingClientRect().x - props.navigation.getBoundingClientRect().x) / props.navigation.getBoundingClientRect().width;
                            props.navigationWidth += (parseFloat(oldLeft) - parseFloat(props.viewport.style.left)) / props.navigation.getBoundingClientRect().width;
                            props.viewport.style.width = (props.navigation.offsetWidth * props.navigationWidth) + "px";
                        } else if (parseFloat(e.pageX - shiftX) <= props.navigation.getBoundingClientRect().x) {
                            props.viewport.style.left = props.navigation.getBoundingClientRect().x + "px";
                            props.navigationStart = 0;
                            props.navigationWidth += (parseFloat(oldLeft) - parseFloat(props.viewport.style.left)) / props.navigation.getBoundingClientRect().width;
                            props.viewport.style.width = (props.navigation.offsetWidth * props.navigationWidth) + "px";
                        }
                    } else if (drag == DRAG_RIGHT) {
                        if ((parseFloat(props.viewport.style.width) > BOUNDS_WIDTH * 2) && (parseFloat(props.viewport.style.left) + props.viewport.getBoundingClientRect().width < props.navigation.getBoundingClientRect().right)) {
                            if (parseFloat(props.viewport.style.left) + (e.pageX + rshiftX) - parseFloat(props.viewport.style.left) < props.navigation.getBoundingClientRect().right) {
                                props.viewport.style.width = (e.pageX + rshiftX) - parseFloat(props.viewport.style.left) + "px";
                            } else {
                                props.viewport.style.width = props.navigation.getBoundingClientRect().width - parseFloat(props.viewport.style.left) + "px";
                            }
                            props.navigationWidth = props.viewport.getBoundingClientRect().width / props.navigation.getBoundingClientRect().width;
                        } else if (parseFloat(props.viewport.style.left) + props.viewport.getBoundingClientRect().width >= props.navigation.getBoundingClientRect().right) {
                            if (parseFloat(props.viewport.style.left) + (e.pageX + rshiftX) - parseFloat(props.viewport.style.left) >= props.navigation.getBoundingClientRect().right)
                                props.viewport.style.width = parseFloat(props.navigation.style.width) - parseFloat(props.viewport.style.left) + "px";
                            else
                                props.viewport.style.width = (e.pageX + rshiftX) - parseFloat(props.viewport.style.left) + "px";

                            props.navigationWidth = 1 - props.navigationStart;
                        } else {
                            if (parseFloat((e.pageX + rshiftX) - parseFloat(props.viewport.style.left)) >= BOUNDS_WIDTH * 2)
                                props.viewport.style.width = (e.pageX + rshiftX) - parseFloat(props.viewport.style.left) + "px";
                            else
                                props.viewport.style.width = BOUNDS_WIDTH * 2 + "px";

                            props.navigationWidth = props.viewport.getBoundingClientRect().width / props.navigation.getBoundingClientRect().width;
                        }

                    }

                    methods.navdecor();
                    methods.redraw(false);
                }


                document.onmousemove = function(e) {
                    moveAt(e);
                }

                function tmoveAt(e) {
                    moveAt(touchToMouse(e));
                }

                document.addEventListener('touchmove', tmoveAt);

                document.onmouseup = function(e) { stopDrag(e); }

                document.addEventListener('touchend', stopDrag);

                function stopDrag(e) {
                    document.onmousemove = null;
                    document.onmouseup = null;
                    props.viewport.onmouseup = null;

                    document.removeEventListener('touchmove', tmoveAt);
                    document.removeEventListener('touchend', stopDrag);

                    methods.setViewtop()
                    methods.redraw(true)
                };

            }

            props.viewport.ondragstart = function() {
                return false;
            };

            function getCoords(elem) { // кроме IE8-
                var box = elem.getBoundingClientRect();
                return {
                    top: box.top + pageYOffset,
                    left: box.left + pageXOffset
                };
            }
            // end drag
            svg.style.position = 'relative';
            svg.addEventListener('click', drawProbe)

            function drawProbe(e) {
                let old_probe = svg.getElementById("probe_" + props.uid);

                if (old_probe) {
                    old_probe.parentNode.removeChild(old_probe);

                    let datapoints = svg.getElementsByTagName("ellipse");

                    for (var i = datapoints.length - 1; i >= 0; i--) {
                        datapoints[i].parentNode.removeChild(datapoints[i]);
                    }

					const removeElements = (elms) => elms.forEach(el => el.remove());
					removeElements( props.graph.querySelectorAll(".infobox") );

                }

                let l = document.createElementNS("http://www.w3.org/2000/svg", "line"),                	
                    x = ((e.offsetX / props.graph.getBoundingClientRect().width) * props.navigationWidth + props.navigationStart) * 100,
                    closestX = 0,
                    origIndex = 0;

                closestX = props.normalizedData.x.reduce(function(prev, curr) {
                    function revertN(el) { return el / props.normalizedData.deltaX + props.normalizedData.shiftX; }

                    let goal = revertN(x);

                    return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
                });;

                origIndex = props.normalizedData.x.indexOf(closestX);


                x = (closestX - props.normalizedData.shiftX) * props.normalizedData.deltaX

                let infobox = document.createElement('div'),
                	xdate = new Date(closestX).toString().split(' '),
                	ib_main = document.createElement('div'),
                	ib_content = document.createElement('div'),
                	ibt_main = document.createTextNode(xdate[0] + ", " + xdate[1] + " " + xdate[2]),
                	ib_graphs = [];

                ib_main.appendChild(ibt_main);
                infobox.appendChild(ib_main);

                let bgColor = window.getComputedStyle(document.body, null).getPropertyValue('background-color');
                if (bgColor == "rgba(0, 0, 0, 0)") bgColor = "#fff";

                for (var i = 0; i < props.normalizedData.y.length; i++) {
                    if (props.hiddenLines.includes(i))
                        continue
                    ib_graphs[i] = document.createElement('div');
                    ib_graphs[i].style.color = props.sourceData.colors["y" + i];
                    ib_graphs[i].style.width = (100/(props.normalizedData.y.length - props.hiddenLines.length) ) + "%";
                    ib_graphs[i].style.padding = "10px 10px 10px 0";
                    let in_span = document.createElement('span');                    
                    in_span.appendChild(document.createTextNode(props.normalizedData.y[i][origIndex]));
                    ib_graphs[i].appendChild(in_span);
                    ib_graphs[i].appendChild(document.createElement('br'));
                    ib_graphs[i].appendChild(document.createTextNode(props.sourceData.names["y" + i] ));
                    ib_content.appendChild(ib_graphs[i]);

                    let c = document.createElementNS("http://www.w3.org/2000/svg", "ellipse"),
                        skewX = 100 / props.graph.getBoundingClientRect().width * props.navigationWidth,
                        skewY = 100 / props.graph.getBoundingClientRect().height * (props.viewTop - props.viewBottom);

                    c.setAttributeNS(null, "cx", x);
                    c.setAttributeNS(null, "cy", (101 - ((props.normalizedData.y[i][origIndex] - props.normalizedData.shiftY) * props.normalizedData.deltaY)));
                    c.setAttributeNS(null, "rx", 4 * skewX);
                    c.setAttributeNS(null, "ry", 4 * skewY);
                    c.setAttributeNS(null, "fill", bgColor);
                    c.setAttributeNS(null, "stroke", props.sourceData.colors["y" + i]);
                    c.setAttributeNS(null, "stroke-width", 2);
                    c.setAttributeNS(null, "vector-effect", "non-scaling-stroke");

                    svg.appendChild(c)

                };

                ib_content.style.display = 'flex';
                infobox.appendChild(ib_content);

                l.setAttributeNS(null, "x1", x);
                l.setAttributeNS(null, "y1", "0");
                l.setAttributeNS(null, "x2", x);
                l.setAttributeNS(null, "y2", "101");
                l.setAttributeNS(null, "id", "probe_" + props.uid);
                l.setAttributeNS(null, "stroke", "#ccc");
                l.setAttributeNS(null, "stroke-width", 0.5);

                l.setAttributeNS(null, "vector-effect", "non-scaling-stroke");

                svg.appendChild(l)

                infobox.className = 'infobox';
                infobox.style.top = props.graph.offsetTop + 10 + "px";
                infobox.style.backgroundColor =  bgColor;
                if(bgColor != "#fff")
                	infobox.style.color = "#eee";
                props.graph.appendChild(infobox);
                infobox.style.left = e.pageX - (infobox.getBoundingClientRect().width/3) + "px";

                if(infobox.getBoundingClientRect().right > props.graph.getBoundingClientRect().right)
                	infobox.style.left = parseInt(infobox.style.left) - parseInt(infobox.getBoundingClientRect().right - props.graph.getBoundingClientRect().right - infobox.getBoundingClientRect().width * 0) + "px";

                if(infobox.getBoundingClientRect().left < props.graph.getBoundingClientRect().left)
                	infobox.style.left = parseInt(infobox.style.left) + parseInt(props.graph.getBoundingClientRect().left - infobox.getBoundingClientRect().left + infobox.getBoundingClientRect().width * 0) + "px";

            }
        },
        drawGuidelines: function() {
            // horizontal
            function getGuideLine(y, n) {
                let l = document.createElementNS("http://www.w3.org/2000/svg", "line");

                l.setAttributeNS(null, "x1", "0");
                l.setAttributeNS(null, "y1", y);
                l.setAttributeNS(null, "x2", "100");
                l.setAttributeNS(null, "y2", y);
                l.setAttributeNS(null, "id", "hline_" + props.uid + "_" + n);
                l.setAttributeNS(null, "stroke", "#ccc");
                l.setAttributeNS(null, "stroke-width", 0.5);

                //l.setAttributeNS(null, "shape-rendering", "geometricPrecision");

                l.setAttributeNS(null, "vector-effect", "non-scaling-stroke");
                return l;
            }

            function getYLabel(y, label) {
                let l = document.createElementNS("http://www.w3.org/2000/svg", "text"),
                    t = document.createTextNode(label),
                    skewX = 100 / props.graph.getBoundingClientRect().width * props.navigationWidth,
                    skewY = 100 / props.graph.getBoundingClientRect().height * (props.viewTop - props.viewBottom);

                //l.setAttributeNS(null, "id", "txt");
                l.setAttributeNS(null, "x", parseFloat(props.navigationStart * 100 / skewX));
                l.setAttributeNS(null, "y", y / skewY - 8);
                l.setAttributeNS(null, "transform", "scale(" + skewX + " " + skewY + ")")
                l.setAttributeNS(null, "color", "#ccc");
                l.appendChild(t);
                return l;
            }

            function getXLabel(x, label) {

                let l = document.createElementNS("http://www.w3.org/2000/svg", "text"),
                    t = document.createTextNode(label),
                    skewX = 100 / props.graph.getBoundingClientRect().width * props.navigationWidth,
                    skewY = 100 / props.graph.getBoundingClientRect().height * (props.viewTop - props.viewBottom);

                if (!x)
                    x = 0.2;
                else
                    x += 0.2;

                l.setAttributeNS(null, "x", x / skewX);
                l.setAttributeNS(null, "y", 101 / skewY - 8);
                l.setAttributeNS(null, "transform", "scale(" + skewX + " " + skewY + ")")
                l.setAttributeNS(null, "color", "#ccc");
                l.appendChild(t);
                return l;
            }

            let svg = document.getElementById("mainGraph_" + props.uid),
                hlines = svg.getElementsByTagName("line"),
                labels = svg.getElementsByTagName("text"),
                datapoints = svg.getElementsByTagName("ellipse"),
                top = 100 * props.viewTop,
                bottom = 100 * props.viewBottom,
                step = (top - bottom) / 6,
                left = 100 * props.navigationStart,
                right = 100 * (props.navigationStart + props.navigationWidth),
                stepX = parseInt(20 * props.navigationWidth),
                lineCounter = 0;

            for (var i = hlines.length - 1; i >= 0; i--) {
                hlines[i].parentNode.removeChild(hlines[i]);
            }

            for (var i = labels.length - 1; i >= 0; i--) {
                labels[i].parentNode.removeChild(labels[i]);
            }

            for (var i = datapoints.length - 1; i >= 0; i--) {
                datapoints[i].parentNode.removeChild(datapoints[i]);
            }

			const removeElements = (elms) => elms.forEach(el => el.remove());
			removeElements( props.graph.querySelectorAll(".infobox") );

            for (var i = 0; i < top - 1; i += step) {
                svg.appendChild(getGuideLine(101 - i, lineCounter++));
                let lb = getYLabel((101 - i), parseInt(i / top * (props.currentTopY - props.normalizedData.shiftY) + props.normalizedData.shiftY));
                svg.appendChild(lb);
            };

            for (var i = 1; i < 100; i += stepX) {
                let index = parseInt((props.sourceData.columns[0].length - 1) * i / 100),
                    dt = new Date(props.sourceData.columns[0][index]).toString().split(" "),
                    labelText = dt[1] + " " + dt[2],
                    lb = getXLabel(i - 1, labelText);
                if (i == 1)
                    continue;
                if (labelText != 'Invalid Date')
                    svg.appendChild(lb);
            };
        }
    };

    methods.init();
    methods.normalize();
    methods.draw();
    methods.setViewtop();
    methods.redraw(false);

    return this;
}