(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.WindGL = factory());
})(this, (function () { 'use strict';

    function createShader(gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);

        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    function createProgram(gl, vertexSource, fragmentSource) {
        var program = gl.createProgram();

        var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
        var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);

        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(program));
        }

        var wrapper = {program: program};

        var numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < numAttributes; i++) {
            var attribute = gl.getActiveAttrib(program, i);
            wrapper[attribute.name] = gl.getAttribLocation(program, attribute.name);
        }
        var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (var i$1 = 0; i$1 < numUniforms; i$1++) {
            var uniform = gl.getActiveUniform(program, i$1);
            wrapper[uniform.name] = gl.getUniformLocation(program, uniform.name);
        }

        return wrapper;
    }

    function createTexture(gl, filter, data, width, height) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        if (data instanceof Uint8Array) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    function bindTexture(gl, texture, unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
    }

    function createBuffer(gl, data) {
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buffer;
    }

    function bindAttribute(gl, buffer, attribute, numComponents) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0);
    }

    function bindFramebuffer(gl, framebuffer, texture) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        if (texture) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        }
    }

    var drawVert = "precision mediump float;\r\n\r\nattribute float a_index;\r\n\r\nuniform sampler2D u_particles;\r\nuniform float u_particles_res;\r\n\r\nvarying vec2 v_particle_pos;\r\n\r\nvoid main() {\r\n    vec4 color = texture2D(u_particles, vec2(\r\n        fract(a_index / u_particles_res),\r\n        floor(a_index / u_particles_res) / u_particles_res));\r\n\r\n    // decode current particle position from the pixel's RGBA value\r\n    v_particle_pos = vec2(\r\n        color.r / 255.0 + color.b,\r\n        color.g / 255.0 + color.a);\r\n\r\n    gl_PointSize = 1.0;\r\n    gl_Position = vec4(2.0 * v_particle_pos.x - 1.0, 1.0 - 2.0 * v_particle_pos.y, 0, 1);\r\n}\r\n";

    var drawFrag = "precision mediump float;\r\n\r\nuniform sampler2D u_wind;\r\nuniform vec2 u_wind_min;\r\nuniform vec2 u_wind_max;\r\nuniform sampler2D u_color_ramp;\r\n\r\nvarying vec2 v_particle_pos;\r\n\r\nvoid main() {\r\n    vec2 velocity = mix(u_wind_min, u_wind_max, texture2D(u_wind, v_particle_pos).rg);\r\n    float speed_t = length(velocity) / length(u_wind_max);\r\n\r\n    // color ramp is encoded in a 16x16 texture\r\n    vec2 ramp_pos = vec2(\r\n        fract(16.0 * speed_t),\r\n        floor(16.0 * speed_t) / 16.0);\r\n\r\n    gl_FragColor = texture2D(u_color_ramp, ramp_pos);\r\n}\r\n";

    var quadVert = "precision mediump float;\r\n\r\nattribute vec2 a_pos;\r\n\r\nvarying vec2 v_tex_pos;\r\n\r\nvoid main() {\r\n    v_tex_pos = a_pos;\r\n    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);\r\n}\r\n";

    var screenFrag = "precision mediump float;\r\n\r\nuniform sampler2D u_screen;\r\nuniform float u_opacity;\r\n\r\nvarying vec2 v_tex_pos;\r\n\r\nvoid main() {\r\n    vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);\r\n    // a hack to guarantee opacity fade out even with a value close to 1.0\r\n    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);\r\n}\r\n";

    var updateFrag = "precision highp float;\r\n\r\nuniform sampler2D u_particles;\r\nuniform sampler2D u_wind;\r\nuniform vec2 u_wind_res;\r\nuniform vec2 u_wind_min;\r\nuniform vec2 u_wind_max;\r\nuniform float u_rand_seed;\r\nuniform float u_speed_factor;\r\nuniform float u_drop_rate;\r\nuniform float u_drop_rate_bump;\r\n\r\nvarying vec2 v_tex_pos;\r\n\r\n// pseudo-random generator\r\nconst vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);\r\nfloat rand(const vec2 co) {\r\n    float t = dot(rand_constants.xy, co);\r\n    return fract(sin(t) * (rand_constants.z + t));\r\n}\r\n\r\n// wind speed lookup; use manual bilinear filtering based on 4 adjacent pixels for smooth interpolation\r\nvec2 lookup_wind(const vec2 uv) {\r\n    // return texture2D(u_wind, uv).rg; // lower-res hardware filtering\r\n    vec2 px = 1.0 / u_wind_res;\r\n    vec2 vc = (floor(uv * u_wind_res)) * px;\r\n    vec2 f = fract(uv * u_wind_res);\r\n    vec2 tl = texture2D(u_wind, vc).rg;\r\n    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg;\r\n    vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg;\r\n    vec2 br = texture2D(u_wind, vc + px).rg;\r\n    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);\r\n}\r\n\r\nvoid main() {\r\n    vec4 color = texture2D(u_particles, v_tex_pos);\r\n    vec2 pos = vec2(\r\n        color.r / 255.0 + color.b,\r\n        color.g / 255.0 + color.a); // decode particle position from pixel RGBA\r\n\r\n    vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(pos));\r\n    float speed_t = length(velocity) / length(u_wind_max);\r\n\r\n    // take EPSG:4236 distortion into account for calculating where the particle moved\r\n    // float distortion = cos(radians(pos.y * 180.0 - 90.0));\r\n    float distortion = 1.0; // no distortion\r\n    vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * u_speed_factor;\r\n\r\n    // update particle position, wrapping around the date line\r\n    pos = fract(1.0 + pos + offset);\r\n\r\n    // a random seed to use for the particle drop\r\n    vec2 seed = (pos + v_tex_pos) * u_rand_seed;\r\n\r\n    // drop rate is a chance a particle will restart at random position, to avoid degeneration\r\n    float drop_rate = u_drop_rate + speed_t * u_drop_rate_bump;\r\n    float drop = step(1.0 - drop_rate, rand(seed));\r\n\r\n    vec2 random_pos = vec2(\r\n        rand(seed + 1.3),\r\n        rand(seed + 2.1));\r\n    pos = mix(pos, random_pos, drop);\r\n\r\n    // encode the new particle position back into RGBA\r\n    gl_FragColor = vec4(\r\n        fract(pos * 255.0),\r\n        floor(pos * 255.0) / 255.0);\r\n}\r\n";

    var defaultRampColors = {
        0.0: '#3288bd',
        0.1: '#66c2a5',
        0.2: '#abdda4',
        0.3: '#e6f598',
        0.4: '#fee08b',
        0.5: '#fdae61',
        0.6: '#f46d43',
        1.0: '#d53e4f'
    };

    var WindGL = function WindGL(gl) {
        this.gl = gl;

        this.fadeOpacity = 0.996; // how fast the particle trails fade on each frame
        this.speedFactor = 0.25; // how fast the particles move
        this.dropRate = 0.003; // how often the particles move to a random place
        this.dropRateBump = 0.01; // drop rate increase relative to individual particle speed

        this.drawProgram = createProgram(gl, drawVert, drawFrag);
        this.screenProgram = createProgram(gl, quadVert, screenFrag);
        this.updateProgram = createProgram(gl, quadVert, updateFrag);

        this.quadBuffer = createBuffer(gl, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
        this.framebuffer = gl.createFramebuffer();

        this.setColorRamp(defaultRampColors);
        this.resize();
    };

    var prototypeAccessors = { numParticles: { configurable: true } };

    WindGL.prototype.resize = function resize () {
        var gl = this.gl;
        var emptyPixels = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
        // screen textures to hold the drawn screen for the previous and the current frame
        this.backgroundTexture = createTexture(gl, gl.NEAREST, emptyPixels, gl.canvas.width, gl.canvas.height);
        this.screenTexture = createTexture(gl, gl.NEAREST, emptyPixels, gl.canvas.width, gl.canvas.height);
    };

    WindGL.prototype.setColorRamp = function setColorRamp (colors) {
        // lookup texture for colorizing the particles according to their speed
        this.colorRampTexture = createTexture(this.gl, this.gl.LINEAR, getColorRamp(colors), 16, 16);
    };

    prototypeAccessors.numParticles.set = function (numParticles) {
        var gl = this.gl;

        // we create a square texture where each pixel will hold a particle position encoded as RGBA
        var particleRes = this.particleStateResolution = Math.ceil(Math.sqrt(numParticles));
        this._numParticles = particleRes * particleRes;

        var particleState = new Uint8Array(this._numParticles * 4);
        for (var i = 0; i < particleState.length; i++) {
            particleState[i] = Math.floor(Math.random() * 256); // randomize the initial particle positions
        }
        // textures to hold the particle state for the current and the next frame
        this.particleStateTexture0 = createTexture(gl, gl.NEAREST, particleState, particleRes, particleRes);
        this.particleStateTexture1 = createTexture(gl, gl.NEAREST, particleState, particleRes, particleRes);

        var particleIndices = new Float32Array(this._numParticles);
        for (var i$1 = 0; i$1 < this._numParticles; i$1++) { particleIndices[i$1] = i$1; }
        this.particleIndexBuffer = createBuffer(gl, particleIndices);
    };
    prototypeAccessors.numParticles.get = function () {
        return this._numParticles;
    };

    WindGL.prototype.setWind = function setWind (windData) {
        this.windData = windData;
        this.windTexture = createTexture(this.gl, this.gl.LINEAR, windData.image);
    };

    WindGL.prototype.draw = function draw () {
        var gl = this.gl;
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);

        bindTexture(gl, this.windTexture, 0);
        bindTexture(gl, this.particleStateTexture0, 1);

        this.drawScreen();
        this.updateParticles();
    };

    WindGL.prototype.drawScreen = function drawScreen () {
        var gl = this.gl;
        // draw the screen into a temporary framebuffer to retain it as the background on the next frame
        bindFramebuffer(gl, this.framebuffer, this.screenTexture);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        this.drawTexture(this.backgroundTexture, this.fadeOpacity);
        this.drawParticles();

        bindFramebuffer(gl, null);
        // enable blending to support drawing on top of an existing background (e.g. a map)
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this.drawTexture(this.screenTexture, 1.0);
        gl.disable(gl.BLEND);

        // save the current screen as the background for the next frame
        var temp = this.backgroundTexture;
        this.backgroundTexture = this.screenTexture;
        this.screenTexture = temp;
    };

    WindGL.prototype.drawTexture = function drawTexture (texture, opacity) {
        var gl = this.gl;
        var program = this.screenProgram;
        gl.useProgram(program.program);

        bindAttribute(gl, this.quadBuffer, program.a_pos, 2);
        bindTexture(gl, texture, 2);
        gl.uniform1i(program.u_screen, 2);
        gl.uniform1f(program.u_opacity, opacity);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    WindGL.prototype.drawParticles = function drawParticles () {
        var gl = this.gl;
        var program = this.drawProgram;
        gl.useProgram(program.program);

        bindAttribute(gl, this.particleIndexBuffer, program.a_index, 1);
        bindTexture(gl, this.colorRampTexture, 2);

        gl.uniform1i(program.u_wind, 0);
        gl.uniform1i(program.u_particles, 1);
        gl.uniform1i(program.u_color_ramp, 2);

        gl.uniform1f(program.u_particles_res, this.particleStateResolution);
        gl.uniform2f(program.u_wind_min, this.windData.uMin, this.windData.vMin);
        gl.uniform2f(program.u_wind_max, this.windData.uMax, this.windData.vMax);

        gl.drawArrays(gl.POINTS, 0, this._numParticles);
    };

    WindGL.prototype.updateParticles = function updateParticles () {
        var gl = this.gl;
        bindFramebuffer(gl, this.framebuffer, this.particleStateTexture1);
        gl.viewport(0, 0, this.particleStateResolution, this.particleStateResolution);

        var program = this.updateProgram;
        gl.useProgram(program.program);

        bindAttribute(gl, this.quadBuffer, program.a_pos, 2);

        gl.uniform1i(program.u_wind, 0);
        gl.uniform1i(program.u_particles, 1);

        gl.uniform1f(program.u_rand_seed, Math.random());
        gl.uniform2f(program.u_wind_res, this.windData.width, this.windData.height);
        gl.uniform2f(program.u_wind_min, this.windData.uMin, this.windData.vMin);
        gl.uniform2f(program.u_wind_max, this.windData.uMax, this.windData.vMax);
        gl.uniform1f(program.u_speed_factor, this.speedFactor);
        gl.uniform1f(program.u_drop_rate, this.dropRate);
        gl.uniform1f(program.u_drop_rate_bump, this.dropRateBump);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // swap the particle state textures so the new one becomes the current one
        var temp = this.particleStateTexture0;
        this.particleStateTexture0 = this.particleStateTexture1;
        this.particleStateTexture1 = temp;
    };

    Object.defineProperties( WindGL.prototype, prototypeAccessors );

    function getColorRamp(colors) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        canvas.width = 256;
        canvas.height = 1;

        var gradient = ctx.createLinearGradient(0, 0, 256, 0);
        for (var stop in colors) {
            gradient.addColorStop(+stop, colors[stop]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 1);

        return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
    }

    return WindGL;

}));
