const axios = require("axios");
const { vespaEndpoint } = require("../config/config");

function docUrl(id) {
  return `${vespaEndpoint}/document/v1/default/doc/docid/${id}`;
}

module.exports = {
  async indexDocument(id, fields) {
    return axios.post(docUrl(id), {
      fields: {
        ...fields,
        vector: {
          values: fields.vector,
          type: "tensor<float>(x[128])"
        }
      }
    });
  },

  async getDocument(id) {
    return axios.get(docUrl(id));
  },

  async deleteDocument(id) {
    return axios.delete(docUrl(id));
  },

  async search(tenantId, q) {
    const yql = `
      select * from doc where (
        title contains "${q}" or body contains "${q}"
      ) and tenantId contains "${tenantId}";
    `;
    return axios.get(`${vespaEndpoint}/search/`, { params: { yql } });
  },

  async semanticSearch(queryVector, tenantId) {
    const yql = `
      select * from doc where (
        ({targetHits:10}nearestNeighbor(vector, qvec))
        and tenantId contains "${tenantId}"
      );
    `;

    return axios.get(`${vespaEndpoint}/search/`, {
      params: {
        yql,
        ranking: "semantic",
        "input.query(qvec)": `[${queryVector.join(",")}]`
      }
    });
  }
};
