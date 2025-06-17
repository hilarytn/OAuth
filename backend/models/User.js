const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: false },
  name: String,
  email: { type: String, required: true, unique: true },
  picture: String,
  password: { type: String },
});
