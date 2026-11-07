'use strict';

// TODO(#43): implementar VistaComparador segun el contrato de proyecto2/README.md.
class VistaComparador {
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
