const MATERIAS = [
  {
    codigo: "MAT-101",
    nombre: "Cálculo I",
    trimestre: 1,
    uc: 5,
    secciones: [
      { id: "001", profesor: "Prof. Jubert Pérez", horario: [{ dia: "LUN", bloques: ["B01","B02"], aula: "A-11" },{ dia: "MIE", bloques: ["B01","B02"], aula: "A-11" },{ dia: "VIE", bloques: ["B01","B02"], aula: "A-11" }] },
      { id: "002", profesor: "Prof. Jubert Pérez", horario: [{ dia: "MAR", bloques: ["B03","B04"], aula: "A-12" },{ dia: "JUE", bloques: ["B03","B04"], aula: "A-12" },{ dia: "VIE", bloques: ["B03","B04"], aula: "A-12" }] },
      { id: "003", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "LUN", bloques: ["B09","B10"], aula: "A-11" },{ dia: "MIE", bloques: ["B09","B10"], aula: "A-11" },{ dia: "VIE", bloques: ["B09","B10"], aula: "A-11" }] },
      { id: "004", profesor: "Prof. Haller Bracho", horario: [{ dia: "MAR", bloques: ["B11","B12"], aula: "A-14" },{ dia: "JUE", bloques: ["B11","B12"], aula: "A-14" },{ dia: "SAB", bloques: ["B01","B02"], aula: "A-14" }] }
    ]
  },
  {
    codigo: "MAT-102",
    nombre: "Álgebra Lineal",
    trimestre: 1,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "LUN", bloques: ["B03","B04"], aula: "A-21" },{ dia: "MIE", bloques: ["B03","B04"], aula: "A-21" }] },
      { id: "002", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "MAR", bloques: ["B01","B02"], aula: "A-21" },{ dia: "JUE", bloques: ["B01","B02"], aula: "A-21" }] },
      { id: "003", profesor: "Prof. Jubert Pérez", horario: [{ dia: "LUN", bloques: ["B11","B12"], aula: "A-22" },{ dia: "MIE", bloques: ["B11","B12"], aula: "A-22" }] },
      { id: "004", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "MAR", bloques: ["B09","B10"], aula: "A-22" },{ dia: "JUE", bloques: ["B09","B10"], aula: "A-22" }] }
    ]
  },
  {
    codigo: "CMP-101",
    nombre: "Introducción a la Programación",
    trimestre: 1,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "LUN", bloques: ["B05","B06"], aula: "C-01" },{ dia: "MIE", bloques: ["B05","B06"], aula: "C-01" }] },
      { id: "002", profesor: "Prof. Victor Kneider", horario: [{ dia: "MAR", bloques: ["B05","B06"], aula: "C-01" },{ dia: "JUE", bloques: ["B05","B06"], aula: "C-01" }] },
      { id: "003", profesor: "Prof. Haller Bracho", horario: [{ dia: "MAR", bloques: ["B13","B14"], aula: "C-02" },{ dia: "JUE", bloques: ["B13","B14"], aula: "C-02" }] }
    ]
  },
  {
    codigo: "HUM-101",
    nombre: "Lenguaje y Comunicación",
    trimestre: 1,
    uc: 3,
    secciones: [
      { id: "001", profesor: "Prof. Jubert Pérez", horario: [{ dia: "VIE", bloques: ["B05","B06","B07"], aula: "B-03" }] },
      { id: "002", profesor: "Prof. Victor Kneider", horario: [{ dia: "LUN", bloques: ["B13","B14","B15"], aula: "B-03" }] },
      { id: "003", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "SAB", bloques: ["B03","B04","B05"], aula: "B-04" }] }
    ]
  },
  {
    codigo: "QUI-101",
    nombre: "Química General",
    trimestre: 1,
    uc: 3,
    secciones: [
      { id: "001", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "LUN", bloques: ["B07","B08"], aula: "A-31" },{ dia: "JUE", bloques: ["B07"], aula: "A-31" }] },
      { id: "002", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "MAR", bloques: ["B07","B08"], aula: "A-31" },{ dia: "VIE", bloques: ["B07"], aula: "A-31" }] },
      { id: "003", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "MIE", bloques: ["B13","B14"], aula: "A-32" },{ dia: "VIE", bloques: ["B13"], aula: "A-32" }] }
    ]
  },
  {
    codigo: "DIB-101",
    nombre: "Dibujo Técnico",
    trimestre: 1,
    uc: 2,
    secciones: [
      { id: "001", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "MIE", bloques: ["B07","B08"], aula: "D-01" }] },
      { id: "002", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "VIE", bloques: ["B11","B12"], aula: "D-01" }] }
    ]
  },
  {
    codigo: "MAT-201",
    nombre: "Cálculo II",
    trimestre: 2,
    uc: 5,
    secciones: [
      { id: "001", profesor: "Prof. Victor Kneider", horario: [{ dia: "LUN", bloques: ["B03","B04"], aula: "A-11" },{ dia: "MIE", bloques: ["B03","B04"], aula: "A-11" },{ dia: "VIE", bloques: ["B03","B04"], aula: "A-11" }] },
      { id: "002", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "MAR", bloques: ["B09","B10"], aula: "A-12" },{ dia: "JUE", bloques: ["B09","B10"], aula: "A-12" },{ dia: "VIE", bloques: ["B09","B10"], aula: "A-12" }] }
    ]
  },
  {
    codigo: "FIS-201",
    nombre: "Física I",
    trimestre: 2,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Haller Bracho", horario: [{ dia: "LUN", bloques: ["B01","B02"], aula: "A-41" },{ dia: "MIE", bloques: ["B01","B02"], aula: "A-41" }] },
      { id: "002", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "MAR", bloques: ["B05","B06"], aula: "A-41" },{ dia: "JUE", bloques: ["B05","B06"], aula: "A-41" }] }
    ]
  },
  {
    codigo: "FIS-202",
    nombre: "Laboratorio de Física I",
    trimestre: 2,
    uc: 1,
    secciones: [
      { id: "001", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "LUN", bloques: ["L02"], aula: "LAB-F1" }] },
      { id: "002", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "MIE", bloques: ["L03"], aula: "LAB-F1" }] },
      { id: "003", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "JUE", bloques: ["L04"], aula: "LAB-F1" }] }
    ]
  },
  {
    codigo: "CMP-201",
    nombre: "Programación I",
    trimestre: 2,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Jubert Pérez", horario: [{ dia: "LUN", bloques: ["B05","B06"], aula: "C-02" },{ dia: "MIE", bloques: ["B07","B08"], aula: "C-02" }] },
      { id: "002", profesor: "Prof. Jubert Pérez", horario: [{ dia: "MAR", bloques: ["B11","B12"], aula: "C-02" },{ dia: "JUE", bloques: ["B11","B12"], aula: "C-02" }] },
      { id: "003", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "MIE", bloques: ["B09","B10","B11"], aula: "C-02" },{ dia: "VIE", bloques: ["B05","B06"], aula: "C-02" }] }
    ]
  },
  {
    codigo: "MAT-202",
    nombre: "Matemáticas Discretas",
    trimestre: 2,
    uc: 3,
    secciones: [
      { id: "001", profesor: "Prof. Jubert Pérez", horario: [{ dia: "MAR", bloques: ["B01","B02"], aula: "A-22" },{ dia: "JUE", bloques: ["B01"], aula: "A-22" }] },
      { id: "002", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "LUN", bloques: ["B09","B10"], aula: "A-21" },{ dia: "VIE", bloques: ["B07"], aula: "A-21" }] }
    ]
  },
  {
    codigo: "HUM-201",
    nombre: "Inglés Técnico",
    trimestre: 2,
    uc: 2,
    secciones: [
      { id: "001", profesor: "Prof. Jubert Pérez", horario: [{ dia: "SAB", bloques: ["B01","B02","B03"], aula: "B-03" }] }
    ]
  },
  {
    codigo: "MAT-301",
    nombre: "Cálculo III",
    trimestre: 3,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "LUN", bloques: ["B01","B02"], aula: "A-12" },{ dia: "MIE", bloques: ["B01","B02"], aula: "A-12" }] },
      { id: "002", profesor: "Prof. Jubert Pérez", horario: [{ dia: "MAR", bloques: ["B09","B10"], aula: "A-14" },{ dia: "JUE", bloques: ["B09","B10"], aula: "A-14" }] }
    ]
  },
  {
    codigo: "FIS-301",
    nombre: "Física II",
    trimestre: 3,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "MAR", bloques: ["B03","B04"], aula: "A-41" },{ dia: "JUE", bloques: ["B03","B04"], aula: "A-41" }] }
    ]
  },
  {
    codigo: "FIS-302",
    nombre: "Laboratorio de Física II",
    trimestre: 3,
    uc: 1,
    secciones: [
      { id: "001", profesor: "Prof. Haller Bracho", horario: [{ dia: "MAR", bloques: ["L02"], aula: "LAB-F2" }] },
      { id: "002", profesor: "Prof. Haller Bracho", horario: [{ dia: "JUE", bloques: ["L01"], aula: "LAB-F2" }] },
      { id: "003", profesor: "Prof. Victor Kneider", horario: [{ dia: "VIE", bloques: ["L04"], aula: "LAB-F2" }] }
    ]
  },
  {
    codigo: "CMP-301",
    nombre: "Programación II",
    trimestre: 3,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Victor Kneider", horario: [{ dia: "LUN", bloques: ["B05","B06"], aula: "C-03" },{ dia: "MIE", bloques: ["B05","B06"], aula: "C-03" }] },
      { id: "002", profesor: "Prof. Haller Bracho", horario: [{ dia: "MAR", bloques: ["B05","B06"], aula: "C-02" },{ dia: "JUE", bloques: ["B05","B06"], aula: "C-02" }] },
      { id: "003", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "VIE", bloques: ["B01","B02","B03"], aula: "C-02" },{ dia: "SAB", bloques: ["B04","B05"], aula: "C-02" }] }
    ]
  },
  {
    codigo: "EST-301",
    nombre: "Estadística I",
    trimestre: 3,
    uc: 3,
    secciones: [
      { id: "001", profesor: "Prof. Haller Bracho", horario: [{ dia: "LUN", bloques: ["B09","B10"], aula: "A-32" },{ dia: "MIE", bloques: ["B09"], aula: "A-32" }] },
      { id: "002", profesor: "Prof. Haller Bracho", horario: [{ dia: "VIE", bloques: ["B09","B10","B11"], aula: "A-32" }] }
    ]
  },
  {
    codigo: "ELE-301",
    nombre: "Circuitos Eléctricos",
    trimestre: 3,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Victor Kneider", horario: [{ dia: "LUN", bloques: ["B11","B12"], aula: "E-01" },{ dia: "MIE", bloques: ["B11","B12"], aula: "E-01" }] },
      { id: "002", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "MAR", bloques: ["B11","B12"], aula: "E-01" },{ dia: "VIE", bloques: ["B11","B12"], aula: "E-01" }] }
    ]
  },
  {
    codigo: "CMP-401",
    nombre: "Estructuras de Datos",
    trimestre: 4,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "LUN", bloques: ["B01","B02"], aula: "C-01" },{ dia: "MIE", bloques: ["B01","B02"], aula: "C-01" }] },
      { id: "002", profesor: "Prof. Haller Bracho", horario: [{ dia: "MAR", bloques: ["B09","B10"], aula: "C-02" },{ dia: "JUE", bloques: ["B09","B10"], aula: "C-02" }] },
      { id: "003", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "LUN", bloques: ["B11","B12"], aula: "C-02" },{ dia: "VIE", bloques: ["B11","B12"], aula: "C-02" }] }
    ]
  },
  {
    codigo: "ELE-401",
    nombre: "Sistemas Digitales",
    trimestre: 4,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "MAR", bloques: ["B03","B04"], aula: "E-01" },{ dia: "JUE", bloques: ["B03","B04"], aula: "E-01" }] },
      { id: "002", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "LUN", bloques: ["B05","B06"], aula: "E-01" },{ dia: "MIE", bloques: ["B05","B06"], aula: "E-01" }] }
    ]
  },
  {
    codigo: "ELE-402",
    nombre: "Laboratorio de Sistemas Digitales",
    trimestre: 4,
    uc: 1,
    secciones: [
      { id: "001", profesor: "Prof. Victor Kneider", horario: [{ dia: "MAR", bloques: ["L02"], aula: "LAB-E1" }] },
      { id: "002", profesor: "Prof. Haller Bracho", horario: [{ dia: "MIE", bloques: ["L03"], aula: "LAB-E1" }] },
      { id: "003", profesor: "Prof. Victor Kneider", horario: [{ dia: "VIE", bloques: ["L05"], aula: "LAB-E1" }] }
    ]
  },
  {
    codigo: "CMP-402",
    nombre: "Bases de Datos I",
    trimestre: 4,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Jubert Pérez", horario: [{ dia: "MAR", bloques: ["B05","B06"], aula: "C-03" },{ dia: "JUE", bloques: ["B05","B06"], aula: "C-03" }] },
      { id: "002", profesor: "Prof. Victor Kneider", horario: [{ dia: "LUN", bloques: ["B07","B08"], aula: "C-03" },{ dia: "MIE", bloques: ["B07","B08"], aula: "C-03" }] }
    ]
  },
  {
    codigo: "MAT-401",
    nombre: "Métodos Numéricos",
    trimestre: 4,
    uc: 3,
    secciones: [
      { id: "001", profesor: "Prof. Haller Bracho", horario: [{ dia: "VIE", bloques: ["B01","B02","B03"], aula: "A-13" }] },
      { id: "002", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "SAB", bloques: ["B01","B02","B03"], aula: "A-12" }] }
    ]
  },
  {
    codigo: "ELE-403",
    nombre: "Electiva I: Robótica",
    trimestre: 4,
    uc: 3,
    secciones: [
      { id: "001", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "VIE", bloques: ["L02"], aula: "LAB-R1" },{ dia: "SAB", bloques: ["B02"], aula: "LAB-R1" }] },
      { id: "002", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "VIE", bloques: ["B02","B03"], aula: "LAB-E1" },{ dia: "SAB", bloques: ["L01"], aula: "LAB-E1" }] }
    ]
  },
  {
    codigo: "CMP-501",
    nombre: "Lenguaje de Clientes Web",
    trimestre: 5,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Victor Kneider", horario: [{ dia: "LUN", bloques: ["B01","B02"], aula: "C-04" },{ dia: "MIE", bloques: ["B01","B02"], aula: "C-04" }] },
      { id: "002", profesor: "Prof. Victor Kneider", horario: [{ dia: "MAR", bloques: ["B09","B10"], aula: "C-04" },{ dia: "JUE", bloques: ["B09","B10"], aula: "C-04" }] },
      { id: "003", profesor: "Prof. Victor Kneider", horario: [{ dia: "SAB", bloques: ["B01","B02","B03","B04"], aula: "C-01" }] }
    ]
  },
  {
    codigo: "CMP-502",
    nombre: "Sistemas Operativos",
    trimestre: 5,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "MAR", bloques: ["B03","B04"], aula: "C-01" },{ dia: "JUE", bloques: ["B03","B04"], aula: "C-01" }] },
      { id: "002", profesor: "Prof. Victor Kneider", horario: [{ dia: "LUN", bloques: ["B09","B10"], aula: "C-01" },{ dia: "MIE", bloques: ["B09","B10"], aula: "C-01" }] },
      { id: "003", profesor: "Prof. Haller Bracho", horario: [{ dia: "SAB", bloques: ["B05","B06","B07","B08"], aula: "C-03" }] }
    ]
  },
  {
    codigo: "CMP-503",
    nombre: "Redes de Computadoras I",
    trimestre: 5,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Jubert Pérez", horario: [{ dia: "MAR", bloques: ["B13","B14"], aula: "C-05" },{ dia: "JUE", bloques: ["B13","B14"], aula: "C-05" }] },
      { id: "002", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "MAR", bloques: ["B11","B12"], aula: "C-05" },{ dia: "JUE", bloques: ["B11","B12"], aula: "C-05" }] },
      { id: "003", profesor: "Prof. Haller Bracho", horario: [{ dia: "MIE", bloques: ["B12","B13","B14"], aula: "C-05" },{ dia: "VIE", bloques: ["B12","B13"], aula: "C-05" }] }
    ]
  },
  {
    codigo: "CMP-504",
    nombre: "Laboratorio de Redes",
    trimestre: 5,
    uc: 1,
    secciones: [
      { id: "001", profesor: "Prof. Genyelbert Acosta", horario: [{ dia: "LUN", bloques: ["L04"], aula: "LAB-R2" }] },
      { id: "002", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "MAR", bloques: ["L03"], aula: "LAB-R2" }] },
      { id: "003", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "JUE", bloques: ["L05"], aula: "LAB-R2" }] },
      { id: "004", profesor: "Prof. Jubert Pérez", horario: [{ dia: "VIE", bloques: ["L04"], aula: "LAB-R2" }] }
    ]
  },
  {
    codigo: "CMP-505",
    nombre: "Ingeniería de Software I",
    trimestre: 5,
    uc: 3,
    secciones: [
      { id: "001", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "MAR", bloques: ["B05","B06"], aula: "C-06" },{ dia: "VIE", bloques: ["B05"], aula: "C-06" }] },
      { id: "002", profesor: "Prof. Daniel Carrizo", horario: [{ dia: "LUN", bloques: ["B11","B12"], aula: "C-06" },{ dia: "JUE", bloques: ["B07"], aula: "C-06" }] },
      { id: "003", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "MIE", bloques: ["B07","B08","B09"], aula: "C-06" }] }
    ]
  },
  {
    codigo: "ELE-501",
    nombre: "Arquitectura del Computador",
    trimestre: 5,
    uc: 4,
    secciones: [
      { id: "001", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "LUN", bloques: ["B03","B04"], aula: "E-02" },{ dia: "MIE", bloques: ["B03","B04"], aula: "E-02" }] },
      { id: "002", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "MAR", bloques: ["B07","B08"], aula: "E-02" },{ dia: "JUE", bloques: ["B07","B08"], aula: "E-02" }] },
      { id: "003", profesor: "Prof. Gilberto Araujo", horario: [{ dia: "VIE", bloques: ["B09","B10"], aula: "E-02" },{ dia: "SAB", bloques: ["B05","B06"], aula: "E-02" }] }
    ]
  }
];