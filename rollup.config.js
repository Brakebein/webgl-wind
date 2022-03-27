import { string } from 'rollup-plugin-string';
import buble from '@rollup/plugin-buble';

export default {
    input: 'src/index.js',
    plugins: [
        string({ include: './src/shaders/*.glsl' }),
        buble()
    ],
    output: [
        {
            file: 'dist/wind-gl.js',
            format: 'umd',
            name: 'WindGL'
        }
    ]
};
