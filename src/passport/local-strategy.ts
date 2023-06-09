import { PrismaClient } from "@prisma/client";
import passport from "passport";
import { Strategy as LocalStrategy, VerifyFunction } from "passport-local";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const verify: VerifyFunction = async (username, password, done) => {
  const user = await prisma.user.findFirst({ where: { username: username } });

  if (!user) {
    return done(null, false, { message: "User not found" });
  }

  const isAuthenticated = await bcrypt.compare(password, user.password);

  if (!isAuthenticated) {
    return done(null, false, { message: "Wrong password" });
  }

  return done(null, { id: user.id, username: user.username });
};

const localStrategy = new LocalStrategy(verify);

const initializePassportLocal = () => {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    const user = await prisma.user.findUnique({
      where: { id: id },
      select: { id: true, username: true }
    });
    if (!user) {
      return done(null, null);
    }
    done(null, user);
  });

  passport.use(localStrategy);
};

export default initializePassportLocal;
