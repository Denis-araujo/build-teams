export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Jogador não encontrado') {
    super(message)
    this.name = 'NotFoundError'
  }
}
