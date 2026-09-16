import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.js";

const gerarToken = (usuario) => {
  return jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const usuarioPublico = (usuario) => ({
  _id: usuario._id,
  nome: usuario.nome,
  email: usuario.email,
  data_criacao_user: usuario.data_criacao_user,
});

export const getUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioId);
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    res.json(usuarioPublico(usuario));
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar usuário." });
  }
};

export const postUsuario = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Preencha todos os campos." });
    }

    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ message: "Já existe uma conta cadastrada com este e-mail." });
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);
    const novoUsuario = await Usuario.create({ nome, email, senha: senhaCriptografada });

    res.status(201).json({ ...usuarioPublico(novoUsuario), token: gerarToken(novoUsuario) });
  } catch (error) {
    res.status(400).json({ message: "Erro ao criar usuário. Verifique os dados enviados." });
  }
};

export const postLogin = async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ message: "Preencha e-mail e senha." });
    }

    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(401).json({ message: "E-mail ou senha incorretos." });
    }

    let senhaValida;
    if (usuario.senha.startsWith("$2")) {
      senhaValida = await bcrypt.compare(senha, usuario.senha);
    } else {
      // Migração de contas antigas que ainda têm senha em texto puro
      senhaValida = usuario.senha === senha;
      if (senhaValida) {
        usuario.senha = await bcrypt.hash(senha, 10);
        await usuario.save();
      }
    }

    if (!senhaValida) {
      return res.status(401).json({ message: "E-mail ou senha incorretos." });
    }

    res.json({ ...usuarioPublico(usuario), token: gerarToken(usuario) });
  } catch (error) {
    res.status(500).json({ message: "Erro ao realizar login." });
  }
};

export const putUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioId);
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    if (String(usuario._id) !== String(req.params.id)) {
      return res.status(403).json({ message: "Você só pode editar o seu próprio usuário." });
    }

    const { nome, email, senha } = req.body;
    if (nome !== undefined) usuario.nome = nome;
    if (email !== undefined) usuario.email = email;
    if (senha) usuario.senha = await bcrypt.hash(senha, 10);

    const usuarioAtualizado = await usuario.save();
    res.json(usuarioPublico(usuarioAtualizado));
  } catch (error) {
    res.status(400).json({ message: "Erro ao atualizar usuário." });
  }
};

export const deleteUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioId);
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    if (String(usuario._id) !== String(req.params.id)) {
      return res.status(403).json({ message: "Você só pode excluir o seu próprio usuário." });
    }

    await Usuario.findByIdAndDelete(usuario._id);
    res.json({ message: "Usuário deletado com sucesso." });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar usuário." });
  }
};