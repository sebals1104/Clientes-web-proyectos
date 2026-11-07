'use strict';

// TODO(#30): implementar TarjetaReceta segun el contrato de proyecto2/README.md.
class TarjetaReceta {
  constructor(contenedor, props) {
    this.contenedor = contenedor;
    this.props = props || {};
  }

  destruir() {
    // TODO: quitar listeners, abortar peticiones y eliminar this.raiz.
  }
}
