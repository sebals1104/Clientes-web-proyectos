'use strict';

// TODO(#42): implementar VistaDetalle segun el contrato de proyecto2/README.md.
class VistaDetalle {
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
