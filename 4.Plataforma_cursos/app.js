import express from 'express';
import fs from 'node:fs/promises';

const app = express();
const PORT = 3000;
const DB_FILE = './database/base_dados.json';

app.use(express.json());

// 🧠 Consultas e Filtragens

// GET /instrutores
app.get('/instrutores', async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    const instrutores = db.usuarios.filter(usuario => usuario.tipo === 'instrutor');
    res.json(instrutores);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar instrutores' });
  }
});

// GET /cursos/com-muitos-comentarios?min=3
app.get('/cursos/com-muitos-comentarios', async (req, res) => {
  try {
    const min = parseInt(req.query.min) || 3;
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    const cursosComComentarios = db.cursos.filter(curso => curso.comentarios.length >= min);
    res.json(cursosComComentarios);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao filtrar cursos' });
  }
});

// GET /usuarios/:id/cursos
app.get('/usuarios/:id/cursos', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const usuario = db.usuarios.find(u => u.id === parseInt(id));
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    const cursosDoUsuario = db.cursos.filter(curso => 
      usuario.cursos_matriculados.includes(curso.id)
    );
    
    res.json(cursosDoUsuario);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar cursos do usuário' });
  }
});

// GET /usuarios/com-progresso-acima?min=80
app.get('/usuarios/com-progresso-acima', async (req, res) => {
  try {
    const min = parseInt(req.query.min) || 80;
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const usuariosComProgresso = db.usuarios
      .filter(usuario => usuario.tipo === 'estudante')
      .filter(usuario => {
        const progressos = Object.values(usuario.progresso || {});
        return progressos.some(progresso => progresso >= min);
      });
    
    res.json(usuariosComProgresso);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao filtrar usuários' });
  }
});

// GET /usuarios/:id/comentarios
app.get('/usuarios/:id/comentarios', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const comentariosDoUsuario = db.cursos.flatMap(curso => 
      curso.comentarios
        .filter(comentario => comentario.usuario_id === parseInt(id))
        .map(comentario => ({
          ...comentario,
          curso_id: curso.id,
          curso_titulo: curso.titulo
        }))
    );
    
    res.json(comentariosDoUsuario);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar comentários' });
  }
});

// 📊 Cálculos e Estatísticas

// GET /cursos/:id/media-progresso
app.get('/cursos/:id/media-progresso', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const curso = db.cursos.find(c => c.id === parseInt(id));
    if (!curso) return res.status(404).json({ error: 'Curso não encontrado' });
    
    const usuariosNoCurso = db.usuarios.filter(usuario => 
      usuario.cursos_matriculados?.includes(parseInt(id))
    );
    
    if (usuariosNoCurso.length === 0) {
      return res.json({ media: 0, quantidade_alunos: 0 });
    }
    
    const somaProgressos = usuariosNoCurso.reduce((total, usuario) => {
      return total + (usuario.progresso?.[id] || 0);
    }, 0);
    
    const media = somaProgressos / usuariosNoCurso.length;
    
    res.json({
      media: parseFloat(media.toFixed(2)),
      quantidade_alunos: usuariosNoCurso.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao calcular média' });
  }
});

// GET /cursos/:id/media-nota
app.get('/cursos/:id/media-nota', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const curso = db.cursos.find(c => c.id === parseInt(id));
    if (!curso) return res.status(404).json({ error: 'Curso não encontrado' });
    
    if (curso.comentarios.length === 0) {
      return res.json({ media: 0, quantidade_comentarios: 0 });
    }
    
    const somaNotas = curso.comentarios.reduce((total, comentario) => {
      return total + comentario.nota;
    }, 0);
    
    const media = somaNotas / curso.comentarios.length;
    
    res.json({
      media: parseFloat(media.toFixed(2)),
      quantidade_comentarios: curso.comentarios.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao calcular média' });
  }
});

// GET /cursos/:id/duracao-total
app.get('/cursos/:id/duracao-total', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const curso = db.cursos.find(c => c.id === parseInt(id));
    if (!curso) return res.status(404).json({ error: 'Curso não encontrado' });
    
    const duracaoTotal = curso.aulas.reduce((total, aula) => {
      return total + aula.duracao_minutos;
    }, 0);
    
    res.json({
      duracao_total_minutos: duracaoTotal,
      quantidade_aulas: curso.aulas.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao calcular duração' });
  }
});

// GET /instrutores/:id/quantidade-cursos
app.get('/instrutores/:id/quantidade-cursos', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const instrutor = db.usuarios.find(u => u.id === parseInt(id));
    if (!instrutor || instrutor.tipo !== 'instrutor') {
      return res.status(404).json({ error: 'Instrutor não encontrado' });
    }
    
    const cursosDoInstrutor = db.cursos.filter(curso => 
      curso.instrutor_id === parseInt(id)
    );
    
    res.json({
      instrutor_id: parseInt(id),
      instrutor_nome: instrutor.nome,
      quantidade_cursos: cursosDoInstrutor.length,
      cursos: cursosDoInstrutor.map(c => ({ id: c.id, titulo: c.titulo }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao contar cursos' });
  }
});

// GET /certificados/por-curso
app.get('/certificados/por-curso', async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const certificadosPorCurso = db.cursos.map(curso => {
      const certificados = db.certificados.filter(cert => cert.curso_id === curso.id);
      return {
        curso_id: curso.id,
        curso_titulo: curso.titulo,
        quantidade_certificados: certificados.length,
        certificados: certificados.map(c => ({
          usuario_id: c.usuario_id,
          data_emissao: c.data_emissao
        }))
      };
    });
    
    res.json(certificadosPorCurso);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao contar certificados' });
  }
});

// 🧩 Transformações e Agrupamentos

// GET /usuarios/agrupados-por-tipo
app.get('/usuarios/agrupados-por-tipo', async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const agrupamento = db.usuarios.reduce((acc, usuario) => {
      if (!acc[usuario.tipo]) {
        acc[usuario.tipo] = { quantidade: 0, usuarios: [] };
      }
      acc[usuario.tipo].quantidade++;
      acc[usuario.tipo].usuarios.push({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      });
      return acc;
    }, {});
    
    res.json(agrupamento);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao agrupar usuários' });
  }
});

// GET /cursos/ordenados-por-nota
app.get('/cursos/ordenados-por-nota', async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const cursosComMedia = db.cursos.map(curso => {
      const media = curso.comentarios.length > 0 
        ? curso.comentarios.reduce((sum, c) => sum + c.nota, 0) / curso.comentarios.length
        : 0;
      return {
        ...curso,
        media_nota: parseFloat(media.toFixed(2)),
        quantidade_comentarios: curso.comentarios.length
      };
    });
    
    cursosComMedia.sort((a, b) => b.media_nota - a.media_nota);
    
    res.json(cursosComMedia);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ordenar cursos' });
  }
});

// GET /usuarios/com-multiplos-certificados
app.get('/usuarios/com-multiplos-certificados', async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const usuariosComCertificados = db.usuarios.map(usuario => {
      const certificados = db.certificados.filter(c => c.usuario_id === usuario.id);
      return {
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        quantidade_certificados: certificados.length,
        certificados: certificados.map(c => ({
          curso_id: c.curso_id,
          data_emissao: c.data_emissao
        }))
      };
    }).filter(usuario => usuario.quantidade_certificados > 1);
    
    res.json(usuariosComCertificados);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao filtrar usuários' });
  }
});

// GET /cursos/:id/alunos-progresso-alto?min=90
app.get('/cursos/:id/alunos-progresso-alto', async (req, res) => {
  try {
    const { id } = req.params;
    const min = parseInt(req.query.min) || 90;
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const curso = db.cursos.find(c => c.id === parseInt(id));
    if (!curso) return res.status(404).json({ error: 'Curso não encontrado' });
    
    const alunosComProgressoAlto = db.usuarios
      .filter(usuario => usuario.progresso?.[id] >= min)
      .map(usuario => ({
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        progresso: usuario.progresso[id],
        possui_certificado: db.certificados.some(c => 
          c.usuario_id === usuario.id && c.curso_id === parseInt(id)
        )
      }));
    
    res.json({
      curso_id: parseInt(id),
      curso_titulo: curso.titulo,
      quantidade_alunos: alunosComProgressoAlto.length,
      alunos: alunosComProgressoAlto
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao filtrar alunos' });
  }
});

// GET /usuarios/:id/status-cursos
app.get('/usuarios/:id/status-cursos', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const usuario = db.usuarios.find(u => u.id === parseInt(id));
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    const cursosComStatus = usuario.cursos_matriculados?.map(cursoId => {
      const curso = db.cursos.find(c => c.id === cursoId);
      const progresso = usuario.progresso?.[cursoId] || 0;
      
      let status;
      if (progresso === 0) status = 'não iniciado';
      else if (progresso >= 90) status = 'completo';
      else status = 'em andamento';
      
      return {
        curso_id: cursoId,
        curso_titulo: curso?.titulo || 'Curso não encontrado',
        progresso,
        status,
        possui_certificado: db.certificados.some(c => 
          c.usuario_id === parseInt(id) && c.curso_id === cursoId
        )
      };
    }) || [];
    
    res.json({
      usuario_id: parseInt(id),
      usuario_nome: usuario.nome,
      cursos: cursosComStatus
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// 🛠️ Simulações e Atualizações

// PATCH /usuarios/:id/progresso/:cursoId
app.patch('/usuarios/:id/progresso/:cursoId', async (req, res) => {
  try {
    const { id, cursoId } = req.params;
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const usuario = db.usuarios.find(u => u.id === parseInt(id));
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    if (!usuario.cursos_matriculados?.includes(parseInt(cursoId))) {
      return res.status(400).json({ error: 'Usuário não está matriculado neste curso' });
    }
    
    // Incrementa o progresso em 10% (máximo 100%)
    const progressoAtual = usuario.progresso?.[cursoId] || 0;
    const novoProgresso = Math.min(progressoAtual + 10, 100);
    
    // Atualiza o progresso
    if (!usuario.progresso) usuario.progresso = {};
    usuario.progresso[cursoId] = novoProgresso;
    
    // Verifica se deve emitir certificado (progresso >= 90)
    const deveEmitirCertificado = novoProgresso >= 90 && 
      !db.certificados.some(c => 
        c.usuario_id === parseInt(id) && c.curso_id === parseInt(cursoId)
      );
    
    if (deveEmitirCertificado) {
      const hoje = new Date().toISOString().split('T')[0];
      db.certificados.push({
        usuario_id: parseInt(id),
        curso_id: parseInt(cursoId),
        data_emissao: hoje
      });
    }
    
    // Salva as alterações
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    
    res.json({
      usuario_id: parseInt(id),
      curso_id: parseInt(cursoId),
      progresso_anterior: progressoAtual,
      progresso_atual: novoProgresso,
      certificado_emitido: deveEmitirCertificado
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar progresso' });
  }
});

// POST /cursos
app.post('/cursos', async (req, res) => {
  try {
    const { titulo, descricao, instrutor_id, aulas } = req.body;
    
    if (!titulo || !descricao || !instrutor_id || !aulas) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    // Verifica se o instrutor existe
    const instrutor = db.usuarios.find(u => 
      u.id === parseInt(instrutor_id) && u.tipo === 'instrutor'
    );
    if (!instrutor) {
      return res.status(400).json({ error: 'Instrutor não encontrado' });
    }
    
    // Cria o novo curso
    const novoId = Math.max(...db.cursos.map(c => c.id), 0) + 1;
    const novoCurso = {
      id: novoId,
      titulo,
      descricao,
      instrutor_id: parseInt(instrutor_id),
      aulas: aulas.map((aula, index) => ({
        id: index + 1,
        titulo: aula.titulo,
        duracao_minutos: aula.duracao_minutos
      })),
      comentarios: []
    };
    
    db.cursos.push(novoCurso);
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    
    res.status(201).json(novoCurso);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar curso' });
  }
});

// POST /cursos/:id/comentarios
app.post('/cursos/:id/comentarios', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, comentario, nota } = req.body;
    
    if (!usuario_id || !comentario || !nota) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    
    if (nota < 1 || nota > 5) {
      return res.status(400).json({ error: 'Nota deve ser entre 1 e 5' });
    }
    
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    // Verifica se o curso existe
    const curso = db.cursos.find(c => c.id === parseInt(id));
    if (!curso) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
    // Verifica se o usuário existe e está matriculado
    const usuario = db.usuarios.find(u => u.id === parseInt(usuario_id));
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    if (!usuario.cursos_matriculados?.includes(parseInt(id))) {
      return res.status(400).json({ error: 'Usuário não está matriculado neste curso' });
    }
    
    // Adiciona o comentário
    const novoComentario = {
      usuario_id: parseInt(usuario_id),
      comentario,
      nota: parseInt(nota)
    };
    
    curso.comentarios.push(novoComentario);
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    
    res.status(201).json({
      ...novoComentario,
      curso_id: parseInt(id),
      usuario_nome: usuario.nome
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar comentário' });
  }
});

// POST /certificados
app.post('/certificados', async (req, res) => {
  try {
    const { usuario_id, curso_id } = req.body;
    
    if (!usuario_id || !curso_id) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    // Verifica se o usuário existe
    const usuario = db.usuarios.find(u => u.id === parseInt(usuario_id));
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verifica se o curso existe
    const curso = db.cursos.find(c => c.id === parseInt(curso_id));
    if (!curso) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
    // Verifica se o usuário está matriculado
    if (!usuario.cursos_matriculados?.includes(parseInt(curso_id))) {
      return res.status(400).json({ error: 'Usuário não está matriculado neste curso' });
    }
    
    // Verifica o progresso
    const progresso = usuario.progresso?.[curso_id] || 0;
    if (progresso < 90) {
      return res.status(400).json({ error: 'Progresso insuficiente (mínimo 90%)' });
    }
    
    // Verifica se já existe certificado
    const certificadoExistente = db.certificados.find(c => 
      c.usuario_id === parseInt(usuario_id) && c.curso_id === parseInt(curso_id)
    );
    if (certificadoExistente) {
      return res.status(400).json({ error: 'Certificado já emitido para este usuário e curso' });
    }
    
    // Cria o certificado
    const hoje = new Date().toISOString().split('T')[0];
    const novoCertificado = {
      usuario_id: parseInt(usuario_id),
      curso_id: parseInt(curso_id),
      data_emissao: hoje
    };
    
    db.certificados.push(novoCertificado);
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    
    res.status(201).json({
      ...novoCertificado,
      usuario_nome: usuario.nome,
      curso_titulo: curso.titulo,
      progresso
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao emitir certificado' });
  }
});

// DELETE /cursos/sem-comentarios
app.delete('/cursos/sem-comentarios', async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    
    const cursosComComentarios = db.cursos.filter(curso => curso.comentarios.length > 0);
    const cursosRemovidos = db.cursos.length - cursosComComentarios.length;
    
    db.cursos = cursosComComentarios;
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    
    res.json({
      cursos_removidos: cursosRemovidos,
      cursos_restantes: cursosComComentarios.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover cursos' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});