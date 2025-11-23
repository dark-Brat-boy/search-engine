function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0; // convert to 32-bit int
    }
    return h;
  }
  
  function generateEmbedding(text) {
    const dims = 128;
    const vec = new Array(dims);
  
    for (let i = 0; i < dims; i++) {
      const h = hash(text + "_" + i);
      // normalize into 0..1 float range
      vec[i] = (h % 1000) / 1000;
    }
    return vec;
  }
  
  module.exports = { generateEmbedding };
  