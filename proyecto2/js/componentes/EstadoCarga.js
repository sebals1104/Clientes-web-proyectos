'use strict';

// TODO(#31): implementar EstadoCarga segun el contrato de proyecto2/README.md.
class EstadoCarga {
  constructor(contenedor, props) {
    this.contenedor = contenedor;
    this.props = props || {};
  }

  destruir() {
    // TODO: quitar listeners, abortar peticiones y eliminar this.raiz.
  }
}
