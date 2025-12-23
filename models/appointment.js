'use strict';

const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    // ✅ REMOVED static associate(models) method
    // All associations are now centralized in models/associations.js

    /**
     * Helper method to check if appointment is in the past
     */
    isPast() {
      const now = new Date();
      const appointmentDateTime = new Date(`${this.date}T${this.time}`);
      return appointmentDateTime < now;
    }

    /**
     * Helper method to check if appointment is today
     */
    isToday() {
      const today = new Date().toISOString().split('T')[0];
      return this.date === today;
    }

    /**
     * Helper method to check if appointment is upcoming
     */
    isUpcoming() {
      const now = new Date();
      const appointmentDateTime = new Date(`${this.date}T${this.time}`);
      return appointmentDateTime > now && ['pending', 'confirmed'].includes(this.status);
    }
  }

  Appointment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fullName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          notEmpty: {
            msg: 'El nombre completo no puede estar vacío'
          },
          len: {
            args: [2, 255],
            msg: 'El nombre debe tener entre 2 y 255 caracteres'
          }
        }
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isEmail: {
            msg: 'Debe proporcionar un email válido'
          }
        }
      },
      phone: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          is: {
            args: /^\d{10}$/,
            msg: 'El teléfono debe tener 10 dígitos'
          }
        }
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: {
            msg: 'Debe proporcionar una fecha válida'
          },
          isNotPast(value) {
            if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
              throw new Error('No se pueden crear citas en fechas pasadas');
            }
          }
        }
      },
      time: {
        type: DataTypes.TIME,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Debe proporcionar una hora'
          }
        }
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'Foreign key to users table. NULL for guest appointments'
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'no_show', 'completed'),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: {
            args: [['pending', 'confirmed', 'cancelled', 'no_show', 'completed']],
            msg: 'Estado inválido'
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'Appointment',
      tableName: 'appointments',
      timestamps: true,
      underscored: false, // Use camelCase for column names
      
      // ============================================================
      // SCOPES - Reusable query patterns (Step 1.2)
      // ============================================================
      scopes: {
        /**
         * Default scope - Always include user info
         */
        defaultScope: {
          attributes: {
            exclude: [] // Include all fields by default
          }
        },

        /**
         * Include user information
         * Usage: Appointment.scope('withUser').findAll()
         */
        withUser: {
          include: [{
            model: sequelize.models.User,
            as: 'user',
            attributes: ['id', 'fullName', 'email', 'phone', 'isVerified']
          }]
        },

        /**
         * Only upcoming appointments (future dates with pending/confirmed status)
         * Usage: Appointment.scope('upcoming').findAll()
         */
        upcoming: {
          where: {
            date: { [Op.gte]: new Date().toISOString().split('T')[0] },
            status: { [Op.in]: ['pending', 'confirmed'] }
          },
          order: [['date', 'ASC'], ['time', 'ASC']]
        },

        /**
         * Today's appointments
         * Usage: Appointment.scope('today').findAll()
         */
        today: {
          where: {
            date: new Date().toISOString().split('T')[0]
          },
          order: [['time', 'ASC']]
        },

        /**
         * Past appointments
         * Usage: Appointment.scope('past').findAll()
         */
        past: {
          where: {
            date: { [Op.lt]: new Date().toISOString().split('T')[0] }
          },
          order: [['date', 'DESC'], ['time', 'DESC']]
        },

        /**
         * Filter by status
         * Usage: Appointment.scope({ method: ['byStatus', 'confirmed'] }).findAll()
         */
        byStatus: (status) => ({
          where: { status }
        }),

        /**
         * Filter by date range
         * Usage: Appointment.scope({ method: ['dateRange', '2025-01-01', '2025-01-31'] }).findAll()
         */
        dateRange: (startDate, endDate) => ({
          where: {
            date: {
              [Op.between]: [startDate, endDate]
            }
          },
          order: [['date', 'ASC'], ['time', 'ASC']]
        }),

        /**
         * Guest appointments (no userId)
         * Usage: Appointment.scope('guests').findAll()
         */
        guests: {
          where: {
            userId: null
          }
        },

        /**
         * Registered user appointments
         * Usage: Appointment.scope('registered').findAll()
         */
        registered: {
          where: {
            userId: { [Op.ne]: null }
          }
        },

        /**
         * Appointments that need confirmation
         * Usage: Appointment.scope('needsConfirmation').findAll()
         */
        needsConfirmation: {
          where: {
            status: 'pending',
            date: { [Op.gte]: new Date().toISOString().split('T')[0] }
          },
          order: [['date', 'ASC'], ['time', 'ASC']]
        },

        /**
         * Active appointments (not cancelled or completed)
         * Usage: Appointment.scope('active').findAll()
         */
        active: {
          where: {
            status: { [Op.notIn]: ['cancelled', 'completed', 'no_show'] }
          }
        }
      },

      // ============================================================
      // INDEXES - For query performance
      // ============================================================
      indexes: [
        {
          name: 'idx_appointment_date_time',
          fields: ['date', 'time']
        },
        {
          name: 'idx_appointment_status',
          fields: ['status']
        },
        {
          name: 'idx_appointment_user_id',
          fields: ['userId']
        },
        {
          name: 'idx_appointment_date_status',
          fields: ['date', 'status']
        }
      ],

      // ============================================================
      // HOOKS - Lifecycle events
      // ============================================================
      hooks: {
        /**
         * Before validation - Clean up phone number
         */
        beforeValidate: (appointment, options) => {
          // Remove spaces and dashes from phone
          if (appointment.phone) {
            appointment.phone = appointment.phone.replace(/[\s\-()]/g, '');
          }
          
          // Trim strings
          if (appointment.fullName) {
            appointment.fullName = appointment.fullName.trim();
          }
          if (appointment.email) {
            appointment.email = appointment.email.trim().toLowerCase();
          }
        },

        /**
         * After create - Log creation
         */
        afterCreate: (appointment, options) => {
          console.log(`📅 New appointment created: ID ${appointment.id} for ${appointment.fullName} on ${appointment.date}`);
        },

        /**
         * After update - Log status changes
         */
        afterUpdate: (appointment, options) => {
          if (appointment.changed('status')) {
            console.log(`📝 Appointment ${appointment.id} status changed to: ${appointment.status}`);
          }
        }
      }
    }
  );

  return Appointment;
};
