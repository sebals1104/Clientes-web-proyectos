'use strict';

// TODO(#35): implementar Paginador segun el contrato de proyecto2/README.md.
class Paginador {
  constructor(contenedor, props) {
    this.contenedor = contenedor;
    this.props = props || {};
  }

  destruir() {
    // TODO: quitar listeners, abortar peticiones y eliminar this.raiz.
  }
}
