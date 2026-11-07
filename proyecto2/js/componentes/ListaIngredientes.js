'use strict';

// TODO(#32): implementar ListaIngredientes segun el contrato de proyecto2/README.md.
class ListaIngredientes {
  constructor(contenedor, props) {
    this.contenedor = contenedor;
    this.props = props || {};
  }

  destruir() {
    // TODO: quitar listeners, abortar peticiones y eliminar this.raiz.
  }
}
