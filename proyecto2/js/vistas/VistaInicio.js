'use strict';

// TODO(#39): implementar VistaInicio segun el contrato de proyecto2/README.md.
class VistaInicio {
  constructor(contenedor, props) {
    this.contenedor = contenedor;
    this.props = props || {};
  }

  destruir() {
    // TODO: quitar listeners, abortar peticiones y eliminar this.raiz.
  }

  obtenerEstado() {
    return {};
  }
}
