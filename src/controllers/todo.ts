import { RequestHandler } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getTodos: RequestHandler = async (req, res, next) => {
  try {
    const todos = await prisma.todo.findMany({
      where: { parentId: null },
      include: { subTodos: true }
    });

    return res.status(200).json({
      message: "Fetch todos success",
      todos: todos
    });
  } catch (error) {
    next(error);
  }
};

export const createTodo: RequestHandler = async (req, res, next) => {
  try {
    const newTodo = await prisma.todo.create({
      data: {
        title: req.body.title.trim(),
        isCompleted: false
      },
      include: { subTodos: true }
    });

    return res.status(200).json({
      message: "Create todo success",
      todo: newTodo
    });
  } catch (error) {
    next(error);
  }
};

export const createSubTodo: RequestHandler = async (req, res, next) => {
  try {
    const parentTodo = await prisma.todo.findUnique({
      where: { id: req.params.todoId }
    });

    if (!parentTodo) {
      return res.status(404).json({
        type: "NOT_FOUND",
        message: "Todo not found"
      });
    }

    if (parentTodo.parentId) {
      return res.status(409).json({
        type: "CONFLICT",
        message: "Subtodo cannot be a parent todo"
      });
    }

    await prisma.todo.create({
      data: {
        title: req.body.title.trim(),
        isCompleted: false,
        parent: { connect: { id: parentTodo.id } }
      }
    });

    return res.status(200).json({
      message: "Create subtodo success"
    });
  } catch (error) {
    next(error);
  }
};

export const updateTodo: RequestHandler = async (req, res, next) => {
  try {
    const todo = await prisma.todo.findUnique({
      where: { id: req.params.todoId }
    });

    if (!todo) {
      return res.status(404).json({
        type: "NOT_FOUND",
        message: "Todo not found"
      });
    }

    const isToggleCompletedStatus: boolean =
      req.body.isCompleted !== undefined &&
      todo.isCompleted === !req.body.isCompleted;

    const updatedTodo = await prisma.todo.update({
      data: { title: req.body.title, isCompleted: req.body.isCompleted },
      where: { id: todo.id },
      include: {
        parent: {
          include: { subTodos: true }
        }
      }
    });

    if (isToggleCompletedStatus && updatedTodo) {
      if (!updatedTodo.parentId) {
        await prisma.todo.updateMany({
          data: { isCompleted: updatedTodo.isCompleted },
          where: { parentId: updatedTodo.id }
        });
      } else {
        const parentTodo = updatedTodo.parent;
        if (!parentTodo || parentTodo.subTodos.length < 1) return;
        const isAllCompleted = parentTodo.subTodos.every(
          (child) => child.isCompleted
        );
        if (!isAllCompleted && parentTodo.isCompleted) {
          await prisma.todo.update({
            where: { id: parentTodo.id },
            data: { isCompleted: false }
          });
        }
        if (isAllCompleted && !parentTodo.isCompleted) {
          await prisma.todo.update({
            where: { id: parentTodo.id },
            data: { isCompleted: true }
          });
        }
      }
    }

    return res.status(200).json({
      message: "Update todo success"
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTodo: RequestHandler = async (req, res, next) => {
  try {
    const todo = await prisma.todo.findUnique({
      where: { id: req.params.todoId }
    });

    if (!todo) {
      return res.status(404).json({
        type: "NOT_FOUND",
        message: "Todo not found"
      });
    }

    await prisma.todo.delete({ where: { id: todo.id } });

    return res.status(200).json({
      message: "Delete todo success"
    });
  } catch (error) {
    next(error);
  }
};
