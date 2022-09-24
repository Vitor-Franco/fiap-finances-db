import * as bcrypt from "bcrypt";
import { sign } from "jsonwebtoken";
import { addDays } from "date-fns";
import { prisma } from "database/prismaClient";
import { AppError } from "@exceptions/AppError";
import auth from "@config/auth";


interface IRequest {
  email: string;
  password: string;
}

interface IResponse {
  user: {
    name: string;
    email: string;
  };
  token: string;
  refresh_token: string;
}

export class AuthenticateUserUseCase {
  async execute({ email, password }: IRequest): Promise<IResponse> {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new AppError("Email or password incorrect");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError("Email or password incorrect");
    }

    const { refresh_token, token } = auth;


    const newToken = sign({}, token.secret, {
        subject: user.id,
        expiresIn: token.expires,
      }
    );

    const newRefreshToken = sign({ email: user.email }, refresh_token.secret, {
        subject: user.id,
        expiresIn: refresh_token.expires,
      }
    );

    const expireDate = addDays(new Date(), refresh_token.expiresNumber);

    await prisma.userToken.create({
      data: {
        refreshToken: newRefreshToken,
        expiresDate: expireDate,
        userId: user.id,
      },
    });

    return {
      user: {
        name: user.name,
        email: user.email,
      },
      token: newToken,
      refresh_token: newRefreshToken,
    };
  }
}
